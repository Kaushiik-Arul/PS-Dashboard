import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { EmployeeStatusResponseDto } from './dto/employee-status.dto';
import { HrbpPointRepository } from './hrbp-point.repository';
import { HrbpPointService } from './hrbp-point.service';

const employeeStatus: EmployeeStatusResponseDto = {
  persNo: '12345',
  statusType: 'Maternity',
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  updatedAt: '2026-09-21T10:00:00.000Z',
  updatedBy: 'hrbp',
};

describe('HrbpPointService', () => {
  let repository: jest.Mocked<HrbpPointRepository>;
  let service: HrbpPointService;

  beforeEach(() => {
    repository = {
      getEmployeeStatuses: jest.fn(),
      employeeExists: jest.fn(),
      createEmployeeStatus: jest.fn(),
      updateEmployeeStatus: jest.fn(),
      deleteEmployeeStatus: jest.fn(),
    } as unknown as jest.Mocked<HrbpPointRepository>;
    service = new HrbpPointService(repository);
  });

  it('returns existing statuses', async () => {
    repository.getEmployeeStatuses.mockResolvedValue([employeeStatus]);

    await expect(service.getEmployeeStatuses()).resolves.toEqual([employeeStatus]);
  });

  it('creates a status for an existing employee', async () => {
    repository.employeeExists.mockResolvedValue(true);
    repository.createEmployeeStatus.mockResolvedValue(employeeStatus);

    await expect(
      service.createEmployeeStatus({
        persNo: '12345',
        statusType: 'Maternity',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        updatedBy: 'hrbp',
      }),
    ).resolves.toEqual(employeeStatus);
  });

  it('rejects an unknown employee', async () => {
    repository.employeeExists.mockResolvedValue(false);

    await expect(
      service.createEmployeeStatus({
        persNo: '99999',
        statusType: 'CRL',
        updatedBy: 'hrbp',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a duplicate employee status', async () => {
    repository.employeeExists.mockResolvedValue(true);
    repository.createEmployeeStatus.mockResolvedValue(null);

    await expect(
      service.createEmployeeStatus({
        persNo: '12345',
        statusType: 'CRL',
        updatedBy: 'hrbp',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ['invalid employee number', { persNo: '12x', statusType: 'CRL', updatedBy: 'hrbp' }],
    ['invalid status', { persNo: '12345', statusType: 'Holiday', updatedBy: 'hrbp' }],
    ['invalid audit role', { persNo: '12345', statusType: 'CRL', updatedBy: 'admin' }],
    ['invalid calendar date', { persNo: '12345', statusType: 'CRL', startDate: '2026-02-31', updatedBy: 'hrbp' }],
    ['end date without start date', { persNo: '12345', statusType: 'CRL', endDate: '2026-09-01', updatedBy: 'hrbp' }],
    ['reversed date range', { persNo: '12345', statusType: 'CRL', startDate: '2026-09-02', endDate: '2026-09-01', updatedBy: 'hrbp' }],
  ])('rejects %s', async (_label, input) => {
    await expect(
      service.createEmployeeStatus(input as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates an existing status', async () => {
    repository.updateEmployeeStatus.mockResolvedValue(employeeStatus);

    await expect(
      service.updateEmployeeStatus('12345', {
        statusType: 'Maternity',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        updatedBy: 'hrbp',
      }),
    ).resolves.toEqual(employeeStatus);
  });

  it('returns not found when updating or deleting a missing status', async () => {
    repository.updateEmployeeStatus.mockResolvedValue(null);
    repository.deleteEmployeeStatus.mockResolvedValue(false);

    await expect(
      service.updateEmployeeStatus('12345', {
        statusType: 'CRL',
        updatedBy: 'hrbp',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteEmployeeStatus('12345')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes an existing status', async () => {
    repository.deleteEmployeeStatus.mockResolvedValue(true);

    await expect(service.deleteEmployeeStatus('12345')).resolves.toBeUndefined();
  });
});