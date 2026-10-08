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
  let getIdpStatus: jest.Mock;
  let getTalentPortfolio: jest.Mock;
  let getDevelopmentPortfolio: jest.Mock;
  let getSuccessionPortfolio: jest.Mock;
  let updateStepAvailability: jest.Mock;
  let updateIdpStatus: jest.Mock;
  let listCareerJourney: jest.Mock;

  beforeEach(() => {
    getEmployees = jest.fn().mockResolvedValue({ employees: [], filterOptions: {} });
    getPppHistory = jest.fn().mockResolvedValue([]);
    getStepOverview = jest.fn().mockResolvedValue({
      active: null,
      availability: { available: false, preferences: null, comments: null },
    });
    getIdpStatus = jest.fn().mockResolvedValue({ available: false, comments: null });
    getTalentPortfolio = jest.fn().mockResolvedValue({
      active: null,
      passive: null,
      nomination: null,
    });
    getDevelopmentPortfolio = jest.fn().mockResolvedValue(null);
    getSuccessionPortfolio = jest.fn().mockResolvedValue({ successor1: null, successor2: null });
    updateStepAvailability = jest.fn();
    updateIdpStatus = jest.fn();
    listCareerJourney = jest.fn().mockResolvedValue([]);
    repository = {
      getEmployees,
      getPppHistory,
      getStepOverview,
      getIdpStatus,
      getTalentPortfolio,
      getDevelopmentPortfolio,
      getSuccessionPortfolio,
      updateStepAvailability,
      updateIdpStatus,
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
    const successionPortfolio = {
      successor1: { jdId: 'JD-100', jdName: 'Plant Director' },
      successor2: null,
    };
    getEmployees.mockResolvedValue({ employees: [employee], filterOptions: {} as never });
    getPppHistory.mockResolvedValue(pppHistory);
    getStepOverview.mockResolvedValue(stepOverview);
    const idpStatus = { available: true, comments: 'Development dialog created' };
    getIdpStatus.mockResolvedValue(idpStatus);
    getTalentPortfolio.mockResolvedValue(talentPortfolio);
    getDevelopmentPortfolio.mockResolvedValue(developmentPortfolio);
    getSuccessionPortfolio.mockResolvedValue(successionPortfolio);

    await expect(service.getProfile('67890', user)).resolves.toEqual({
      employee,
      careerJourney: [],
      pppHistory,
      stepOverview,
      idpStatus,
      talentPortfolio,
      developmentPortfolio,
      successionPortfolio,
    });
    expect(getPppHistory).toHaveBeenCalledWith('67890');
    expect(getStepOverview).toHaveBeenCalledWith('67890');
    expect(getIdpStatus).toHaveBeenCalledWith('67890');
    expect(getTalentPortfolio).toHaveBeenCalledWith('67890');
    expect(getDevelopmentPortfolio).toHaveBeenCalledWith('67890');
    expect(getSuccessionPortfolio).toHaveBeenCalledWith('67890');
    expect(listCareerJourney).toHaveBeenCalledWith('67890');
  });

  it('does not load profile details for an employee outside the workforce scope', async () => {
    await expect(service.getProfile('67890', user)).rejects.toThrow(
      'Employee was not found within your workforce scope.',
    );
    expect(getPppHistory).not.toHaveBeenCalled();
    expect(getStepOverview).not.toHaveBeenCalled();
    expect(getIdpStatus).not.toHaveBeenCalled();
    expect(getTalentPortfolio).not.toHaveBeenCalled();
    expect(getDevelopmentPortfolio).not.toHaveBeenCalled();
    expect(getSuccessionPortfolio).not.toHaveBeenCalled();
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

  it('updates IDP availability with normalized comments after confirming workforce scope', async () => {
    const employee = { persNo: '67890' } as never;
    getEmployees.mockResolvedValue({ employees: [employee], filterOptions: {} as never });
    updateIdpStatus.mockResolvedValue({ available: true, comments: 'Development dialog created' });

    await expect(service.updateIdpStatus('67890', {
      available: true,
      comments: '  Development dialog created  ',
    }, user)).resolves.toEqual({ available: true, comments: 'Development dialog created' });
    expect(updateIdpStatus).toHaveBeenCalledWith(
      '67890',
      true,
      'Development dialog created',
      user.accountId,
    );
  });

  it('clears IDP comments when availability is No', async () => {
    const employee = { persNo: '67890' } as never;
    getEmployees.mockResolvedValue({ employees: [employee], filterOptions: {} as never });
    updateIdpStatus.mockResolvedValue({ available: false, comments: null });

    await service.updateIdpStatus('67890', {
      available: false,
      comments: 'This value must be discarded',
    }, user);

    expect(updateIdpStatus).toHaveBeenCalledWith('67890', false, null, user.accountId);
  });

  it('normalizes whitespace-only IDP comments to null', async () => {
    const employee = { persNo: '67890' } as never;
    getEmployees.mockResolvedValue({ employees: [employee], filterOptions: {} as never });
    updateIdpStatus.mockResolvedValue({ available: true, comments: null });

    await service.updateIdpStatus('67890', {
      available: true,
      comments: '   ',
    }, user);

    expect(updateIdpStatus).toHaveBeenCalledWith('67890', true, null, user.accountId);
  });

  it('rejects malformed or overlong IDP status input', async () => {
    const employee = { persNo: '67890' } as never;
    getEmployees.mockResolvedValue({ employees: [employee], filterOptions: {} as never });

    await expect(service.updateIdpStatus('67890', {
      available: true,
      comments: null,
      unexpected: true,
    }, user)).rejects.toThrow(BadRequestException);
    await expect(service.updateIdpStatus('67890', {
      available: true,
      comments: 'x'.repeat(4001),
    }, user)).rejects.toThrow(BadRequestException);
    expect(updateIdpStatus).not.toHaveBeenCalled();
  });

  it('does not update IDP status outside the workforce scope', async () => {
    await expect(service.updateIdpStatus('67890', {
      available: true,
      comments: null,
    }, user)).rejects.toThrow('Employee was not found within your workforce scope.');
    expect(updateIdpStatus).not.toHaveBeenCalled();
  });
});