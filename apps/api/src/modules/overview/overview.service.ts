import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { OverviewResponseDto } from './dto/overview-response.dto';
import {
  type NormalizedOverviewFilters,
  type OverviewFilterDto,
} from './dto/overview-filter.dto';
import { OverviewRepository } from './overview.repository';

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(private readonly repository: OverviewRepository) {}

  async getOverview(
    filters: OverviewFilterDto,
    accountId: string,
  ): Promise<OverviewResponseDto> {
    const normalizedFilters = this.normalizeFilters(filters);

    try {
      return await this.repository.getOverview(normalizedFilters, accountId);
    } catch {
      this.logger.error('Overview database query failed');
      throw new InternalServerErrorException(
        'Unable to load the workforce overview',
      );
    }
  }

  private normalizeFilters(filters: OverviewFilterDto): NormalizedOverviewFilters {
    const normalize = (value: unknown, label: string): string | null => {
      if (value === undefined || value === '') return null;
      if (typeof value !== 'string' || value.length > 200) {
        throw new BadRequestException(`${label} filter is invalid`);
      }
      return value.trim() || null;
    };

    return {
      functionName: normalize(filters.functionName, 'Function'),
      orgUnit: normalize(filters.orgUnit, 'Organizational unit'),
      range: normalize(filters.range, 'Range'),
      location: normalize(filters.location, 'Location'),
      gender: normalize(filters.gender, 'Gender'),
      directOrIndirect: normalize(
        filters.directOrIndirect,
        'Direct or indirect',
      ),
    };
  }
}