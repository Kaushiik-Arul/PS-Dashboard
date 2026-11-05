import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser, UserRole } from '../auth/auth.types';
import { OverviewRepository } from './overview.repository';
import { OverviewService } from './overview.service';
import type { OverviewResponseDto } from './dto/overview-response.dto';

const user = {
  accountId: 'account-id',
  persNo: '12345',
  role: 'hrbp',
  roles: ['hrbp'],
} as AuthenticatedUser;

const employeeDetail = {
  personnelNumber: '67890',
  functionName: 'Engineering',
  orgUnit: 'Platform',
  range: 'PS-ES-IN',
  location: 'Bangalore',
  gender: 'F',
  directOrIndirect: 'Direct',
  ageYears: 36,
  tenureYears: 6.5,
  retirementDate: '2050-05-14',
};

describe('OverviewService', () => {
  let repository: jest.Mocked<OverviewRepository>;
  let service: OverviewService;
  let getOverview: jest.Mock;
  let getOverviewDetails: jest.Mock;

  beforeEach(() => {
    getOverview = jest.fn();
    getOverviewDetails = jest.fn();
    repository = {
      getOverview,
      getOverviewDetails,
    } as unknown as jest.Mocked<OverviewRepository>;
    service = new OverviewService(repository);
  });

  it('forwards normalized filters and authenticated account scope', async () => {
    const response = {} as OverviewResponseDto;
    getOverview.mockResolvedValue(response);

    await expect(service.getOverview({ range: ['  PS/CA-IN  ', 'PS/CA-IN', 'PS/ES-IN'] }, 'account-id'))
      .resolves.toBe(response);

    expect(getOverview).toHaveBeenCalledWith(
      {
        functionName: [],
        orgUnit: [],
        range: ['PS/CA-IN', 'PS/ES-IN'],
        location: [],
        gender: [],
        directOrIndirect: [],
        reportingMonth: null,
      },
      'account-id',
    );
  });

  it('rejects invalid filters before querying scoped data', async () => {
    await expect(service.getOverview({ range: 42 as never }, 'account-id'))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(getOverview).not.toHaveBeenCalled();
  });

  it('forwards KPI detail metric, filters, and authenticated account scope', async () => {
    getOverviewDetails.mockResolvedValue([]);

    await expect(service.getOverviewDetails(
      { metric: 'direct-hc', location: ['  Bangalore  ', 'Pune'] },
      user,
    )).resolves.toEqual([]);

    expect(getOverviewDetails).toHaveBeenCalledWith(
      'direct-hc',
      {
        functionName: [],
        orgUnit: [],
        range: [],
        location: ['Bangalore', 'Pune'],
        gender: [],
        directOrIndirect: [],
        reportingMonth: null,
      },
      'account-id',
    );
  });

  it('preserves employee detail dates and derived values for HRBP', async () => {
    getOverviewDetails.mockResolvedValue([employeeDetail]);

    await expect(service.getOverviewDetails({ metric: 'avg-age' }, user))
      .resolves.toEqual([employeeDetail]);
  });

  it.each<UserRole>(['admin', 'range_head', 'department_head', 'sub_department_head'])(
    'redacts employee detail dates and derived values for the %s role',
    async (role) => {
      getOverviewDetails.mockResolvedValue([employeeDetail]);

      const result = await service.getOverviewDetails(
        { metric: 'avg-age' },
        { ...user, role, roles: [role] },
      );

      expect(result[0]).toEqual({
        ...employeeDetail,
        ageYears: null,
        tenureYears: null,
        retirementDate: null,
      });
    },
  );

  it('preserves employee details when HRBP is one of multiple roles', async () => {
    getOverviewDetails.mockResolvedValue([employeeDetail]);

    await expect(service.getOverviewDetails(
      { metric: 'avg-tenure' },
      { ...user, role: 'range_head', roles: ['range_head', 'hrbp'] },
    )).resolves.toEqual([employeeDetail]);
  });

  it('rejects an unsupported KPI detail metric', async () => {
    await expect(service.getOverviewDetails(
      { metric: 'unknown' },
      user,
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(getOverviewDetails).not.toHaveBeenCalled();
  });
});