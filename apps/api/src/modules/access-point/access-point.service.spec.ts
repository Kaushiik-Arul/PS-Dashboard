import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AccessPointRepository } from './access-point.repository';
import { AccessPointService } from './access-point.service';
import type { AccessAssignmentDto, EmployeeCandidateDto } from './dto/access-point.dto';

const metadata = { ipAddress: null, userAgent: null };
const employee: EmployeeCandidateDto = {
  persNo: '12345',
  employeeName: 'Jane Doe',
  email: 'jane.doe@bosch.com',
  range: 'Group 1',
  orgUnit: 'Engineering',
  designation: 'Manager',
  hasAccount: false,
};
const assignment: AccessAssignmentDto = {
  assignmentId: '36f24a1e-92f0-4e26-8e2e-65a3b23d9c60',
  accountId: 'ea599947-cedc-453c-99ba-20cdef44933b',
  persNo: employee.persNo,
  employeeName: employee.employeeName,
  email: employee.email!,
  accountStatus: 'active',
  mustChangePassword: true,
  role: 'department_head',
  assignedRange: 'Group 1',
  assignedOrgUnit: 'Engineering',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

describe('AccessPointService', () => {
  let repository: jest.Mocked<AccessPointRepository>;
  let authService: jest.Mocked<AuthService>;
  let service: AccessPointService;

  beforeEach(() => {
    repository = {
      searchEmployees: jest.fn(),
      getEmployee: jest.fn(),
      getScopeOptions: jest.fn(),
      scopeExists: jest.fn(),
      listAssignments: jest.fn(),
      createAssignment: jest.fn(),
      updateAssignment: jest.fn(),
      deactivateAccount: jest.fn(),
    } as unknown as jest.Mocked<AccessPointRepository>;
    authService = {
      hashTemporaryPassword: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;
    service = new AccessPointService(repository, authService);
  });

  it('creates an account and scoped assignment from a namelist employee', async () => {
    repository.getEmployee.mockResolvedValue(employee);
    repository.scopeExists.mockResolvedValue(true);
    authService.hashTemporaryPassword.mockResolvedValue('argon-hash');
    repository.createAssignment.mockResolvedValue(assignment);

    await expect(service.createAssignment({
      persNo: employee.persNo,
      role: 'department_head',
      assignedRange: 'Group 1',
      assignedOrgUnit: 'Engineering',
      temporaryPassword: 'temporary-password',
    }, 'actor-id', metadata)).resolves.toEqual(assignment);

    expect(authService.hashTemporaryPassword).toHaveBeenCalledWith('temporary-password');
    expect(repository.createAssignment).toHaveBeenCalledWith(
      employee,
      {
        role: 'department_head',
        assignedRange: 'Group 1',
        assignedOrgUnit: 'Engineering',
      },
      'argon-hash',
      'actor-id',
      metadata,
    );
  });

  it('adds an assignment without replacing an existing account password', async () => {
    repository.getEmployee.mockResolvedValue({ ...employee, hasAccount: true });
    repository.scopeExists.mockResolvedValue(true);
    repository.createAssignment.mockResolvedValue(assignment);

    await service.createAssignment({
      persNo: employee.persNo,
      role: 'range_head',
      assignedRange: 'Group 1',
    }, 'actor-id', metadata);

    expect(authService.hashTemporaryPassword).not.toHaveBeenCalled();
    expect(repository.createAssignment).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      null,
      'actor-id',
      metadata,
    );
  });

  it('rejects employees missing from the namelist', async () => {
    repository.scopeExists.mockResolvedValue(true);
    repository.getEmployee.mockResolvedValue(null);

    await expect(service.createAssignment({
      persNo: '99999',
      role: 'range_head',
      assignedRange: 'Group 1',
      temporaryPassword: 'temporary-password',
    }, 'actor-id', metadata)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['Admin with scope', { role: 'admin', assignedRange: 'Group 1' }],
    ['Range Head without Range', { role: 'range_head' }],
    ['Range Head with Org Unit', { role: 'range_head', assignedRange: 'Group 1', assignedOrgUnit: 'Engineering' }],
    ['Department Head without Org Unit', { role: 'department_head', assignedRange: 'Group 1' }],
  ])('rejects %s', async (_label, input) => {
    await expect(service.createAssignment({
      persNo: employee.persNo,
      temporaryPassword: 'temporary-password',
      ...input,
    } as never, 'actor-id', metadata)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents the HRBP from deactivating their own account', async () => {
    const accountId = 'ea599947-cedc-453c-99ba-20cdef44933b';
    await expect(
      service.deactivateAccount(accountId, accountId, metadata),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
