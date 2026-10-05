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
  let getStepOverview: jest.Mock;
  let getTalentPortfolio: jest.Mock;
  let getDevelopmentPortfolio: jest.Mock;
  let updateStepAvailability: jest.Mock;
  let listCareerJourney: jest.Mock;

  beforeEach(() => {
    getEmployees = jest.fn().mockResolvedValue({ employees: [], filterOptions: {} });
    getPppHistory = jest.fn().mockResolvedValue([]);
    getStepOverview = jest.fn().mockResolvedValue({
      active: null,
      availability: { available: false, preferences: null, comments: null },
    });
    getTalentPortfolio = jest.fn().mockResolvedValue({
      active: null,
      passive: null,
      nomination: null,
    });
    getDevelopmentPortfolio = jest.fn().mockResolvedValue(null);
    updateStepAvailability = jest.fn();
    listCareerJourney = jest.fn().mockResolvedValue([]);
    repository = {
      getEmployees,
      getPppHistory,
      getStepOverview,
      getTalentPortfolio,
      getDevelopmentPortfolio,
      updateStepAvailability,
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
    const stepOverview = {
      active: {
        year: 2026,
        departmentFrom: 'Manufacturing',
        departmentTo: 'Engineering',
        exchangedWith: 'Jane Smith',
        stepPeriodFrom: '2026-01-01',
        stepPeriodTo: '2026-12-31',
      },
      availability: { available: true, preferences: 'Quality', comments: 'Open to rotation' },
    };
    const talentPortfolio = {
      active: {
        type: 'TP1',
        startDate: '2026-01-01',
        endDateOrAdmission: '2027-07-31',
      },
      passive: null,
      nomination: {
        type: 'TP2',
        startDate: null,
        endDateOrAdmission: 'Admitted',
      },
    };
    const developmentPortfolio = {
      developmentPool: 'Future talent',
      poolStartDate: '2026-01-01',
      poolEndDate: '2027-12-31',
    };
    getEmployees.mockResolvedValue({ employees: [employee], filterOptions: {} as never });
    getPppHistory.mockResolvedValue(pppHistory);
    getStepOverview.mockResolvedValue(stepOverview);
    getTalentPortfolio.mockResolvedValue(talentPortfolio);
    getDevelopmentPortfolio.mockResolvedValue(developmentPortfolio);

    await expect(service.getProfile('67890', user)).resolves.toEqual({
      employee,
      careerJourney: [],
      pppHistory,
      stepOverview,
      talentPortfolio,
      developmentPortfolio,
    });
    expect(getPppHistory).toHaveBeenCalledWith('67890');
    expect(getStepOverview).toHaveBeenCalledWith('67890');
    expect(getTalentPortfolio).toHaveBeenCalledWith('67890');
    expect(getDevelopmentPortfolio).toHaveBeenCalledWith('67890');
    expect(listCareerJourney).toHaveBeenCalledWith('67890');
  });

  it('does not load profile details for an employee outside the workforce scope', async () => {
    await expect(service.getProfile('67890', user)).rejects.toThrow(
      'Employee was not found within your workforce scope.',
    );
    expect(getPppHistory).not.toHaveBeenCalled();
    expect(getStepOverview).not.toHaveBeenCalled();
    expect(getTalentPortfolio).not.toHaveBeenCalled();
    expect(getDevelopmentPortfolio).not.toHaveBeenCalled();
    expect(listCareerJourney).not.toHaveBeenCalled();
  });

  it('updates STEP availability only after confirming workforce scope', async () => {
    const employee = { persNo: '67890' } as never;
    const updated = { available: true, preferences: 'Quality', comments: 'Open to rotation' };
    getEmployees.mockResolvedValue({ employees: [employee], filterOptions: {} as never });
    updateStepAvailability.mockResolvedValue(updated);

    await expect(service.updateStepAvailability('67890', updated, user)).resolves.toEqual(updated);
    expect(updateStepAvailability).toHaveBeenCalledWith(
      '67890',
      true,
      'Quality',
      'Open to rotation',
      user.accountId,
    );
  });

  it('does not update STEP availability outside the workforce scope', async () => {
    await expect(service.updateStepAvailability('67890', {
      available: true,
      preferences: 'Quality',
      comments: null,
    }, user)).rejects.toThrow('Employee was not found within your workforce scope.');
    expect(updateStepAvailability).not.toHaveBeenCalled();
  });
});