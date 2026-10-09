import { BadRequestException } from '@nestjs/common';
import { OverviewRepository } from './overview.repository';
import { OverviewService } from './overview.service';
import type { OverviewResponseDto } from './dto/overview-response.dto';

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
      'account-id',
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

  it('rejects an unsupported KPI detail metric', async () => {
    await expect(service.getOverviewDetails(
      { metric: 'unknown' },
      'account-id',
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(getOverviewDetails).not.toHaveBeenCalled();
  });
});