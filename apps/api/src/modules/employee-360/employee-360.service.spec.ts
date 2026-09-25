import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CareerJourneyRepository } from './career-journey.repository';
import { Employee360Repository } from './employee-360.repository';
import { Employee360Service } from './employee-360.service';

const user = {
  accountId: 'ea599947-cedc-453c-99ba-20cdef44933b',
  persNo: '12345',
} as AuthenticatedUser;

describe('Employee360Service', () => {
  let repository: jest.Mocked<Employee360Repository>;
  let careerJourneyRepository: jest.Mocked<CareerJourneyRepository>;
  let service: Employee360Service;
  let getEmployees: jest.Mock;
  let getPppHistory: jest.Mock;
  let listCareerJourney: jest.Mock;

  beforeEach(() => {
    getEmployees = jest.fn().mockResolvedValue({ employees: [], filterOptions: {} });
    getPppHistory = jest.fn().mockResolvedValue([]);
    listCareerJourney = jest.fn().mockResolvedValue([]);
    repository = {
      getEmployees,
      getPppHistory,
    } as unknown as jest.Mocked<Employee360Repository>;
    careerJourneyRepository = {
      list: listCareerJourney,
    } as unknown as jest.Mocked<CareerJourneyRepository>;
    service = new Employee360Service(repository, careerJourneyRepository);
  });

  it('normalizes filters and forwards account and employee identity', async () => {
    await service.getEmployees({
      search: '  Jane  ',
      range: '  PS-CC/RBU-IN  ',
    }, user);

    expect(getEmployees).toHaveBeenCalledWith(
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

  it('rejects invalid search input', () => {
    expect(() => service.getEmployees({ search: 'x'.repeat(101) }, user))
      .toThrow(BadRequestException);
    expect(getEmployees).not.toHaveBeenCalled();
  });

  it('adds PPP history to an authorized employee profile', async () => {
    const employee = { persNo: '67890' } as never;
    const pppHistory = [{ year: 2026, performance: 'A', position: 'P2', person: 'Ready', tcl: 'Met' }];
    getEmployees.mockResolvedValue({ employees: [employee], filterOptions: {} as never });
    getPppHistory.mockResolvedValue(pppHistory);

    await expect(service.getProfile('67890', user)).resolves.toEqual({
      employee,
      careerJourney: [],
      pppHistory,
    });
    expect(getPppHistory).toHaveBeenCalledWith('67890');
    expect(listCareerJourney).toHaveBeenCalledWith('67890');
  });
});