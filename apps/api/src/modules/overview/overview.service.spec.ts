import { BadRequestException } from '@nestjs/common';
import { OverviewRepository } from './overview.repository';
import { OverviewService } from './overview.service';
import type { OverviewResponseDto } from './dto/overview-response.dto';

describe('OverviewService', () => {
  let repository: jest.Mocked<OverviewRepository>;
  let service: OverviewService;
  let getOverview: jest.Mock;

  beforeEach(() => {
    getOverview = jest.fn();
    repository = {
      getOverview,
    } as unknown as jest.Mocked<OverviewRepository>;
    service = new OverviewService(repository);
  });

  it('forwards normalized filters and authenticated account scope', async () => {
    const response = {} as OverviewResponseDto;
    getOverview.mockResolvedValue(response);

    await expect(service.getOverview({ range: '  PS/CA-IN  ' }, 'account-id'))
      .resolves.toBe(response);

    expect(getOverview).toHaveBeenCalledWith(
      {
        functionName: null,
        orgUnit: null,
        range: 'PS/CA-IN',
        location: null,
        gender: null,
        directOrIndirect: null,
      },
      'account-id',
    );
  });

  it('rejects invalid filters before querying scoped data', async () => {
    await expect(service.getOverview({ range: 42 as never }, 'account-id'))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(getOverview).not.toHaveBeenCalled();
  });
});