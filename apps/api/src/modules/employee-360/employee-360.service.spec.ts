import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Employee360Repository } from './employee-360.repository';
import { Employee360Service } from './employee-360.service';

const user = {
  accountId: 'ea599947-cedc-453c-99ba-20cdef44933b',
  persNo: '12345',
} as AuthenticatedUser;

describe('Employee360Service', () => {
  let repository: jest.Mocked<Employee360Repository>;
  let service: Employee360Service;

  beforeEach(() => {
    repository = {
      getEmployees: jest.fn().mockResolvedValue({ employees: [], filterOptions: {} }),
    } as unknown as jest.Mocked<Employee360Repository>;
    service = new Employee360Service(repository);
  });

  it('normalizes filters and forwards account and employee identity', async () => {
    await service.getEmployees({
      search: '  Jane  ',
      range: '  PS-CC/RBU-IN  ',
    }, user);

    expect(repository.getEmployees).toHaveBeenCalledWith(
      {
        search: 'Jane',
        functionName: null,
        orgUnit: null,
        range: 'PS-CC/RBU-IN',
        location: null,
        gender: null,
        directOrIndirect: null,
      },
      user.accountId,
      user.persNo,
    );
  });

  it('rejects invalid search input', async () => {
    await expect(service.getEmployees({ search: 'x'.repeat(101) }, user))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.getEmployees).not.toHaveBeenCalled();
  });
});