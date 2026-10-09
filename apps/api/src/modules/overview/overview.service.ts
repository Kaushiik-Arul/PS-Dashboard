import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OverviewResponseDto } from './dto/overview-response.dto';
import {
  overviewDetailMetrics,
  type NormalizedOverviewFilters,
  type OverviewDetailMetric,
  type OverviewDetailsFilterDto,
  type OverviewFilterDto,
} from './dto/overview-filter.dto';
import type { OverviewEmployeeDetailDto } from './dto/overview-response.dto';
import { OverviewRepository } from './overview.repository';

@Injectable()
export class OverviewService {
  private readonly logger = new Logger(OverviewService.name);

  constructor(private readonly repository: OverviewRepository) {}

  async getAvailableMonths(): Promise<{ currentMonth: string | null; detailedMonths: string[] }> {
    try {
      return await this.repository.getAvailableMonths();
    } catch (error) {
      this.logger.error(
        'Overview available months query failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Unable to load available reporting months',
      );
    }
  }

  async getArchivedMonths(): Promise<string[]> {
    try {
      return await this.repository.getArchivedMonths();
    } catch (error) {
      this.logger.error('Overview archived months query failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Unable to load archived reporting months');
    }
  }

  async getArchivedOverview(reportingMonthInput: string): Promise<OverviewResponseDto> {
    const reportingMonth = this.normalizeReportingMonth(reportingMonthInput);
    if (!reportingMonth) throw new BadRequestException('Reporting month is required');
    try {
      const overview = await this.repository.getArchivedOverview(reportingMonth);
      if (!overview) throw new NotFoundException('Archived Overview month was not found');
      return overview;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Archived Overview query failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Unable to load archived workforce overview');
    }
  }

  async getOverview(
    filters: OverviewFilterDto,
    accountId: string,
  ): Promise<OverviewResponseDto> {
    const normalizedFilters = this.normalizeFilters(filters);

    try {
      return await this.repository.getOverview(normalizedFilters, accountId);
    } catch (error) {
      this.logger.error(
        'Overview database query failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Unable to load the workforce overview',
      );
    }
  }

  async getOverviewDetails(
    filters: OverviewDetailsFilterDto,
    accountId: string,
  ): Promise<OverviewEmployeeDetailDto[]> {
    if (!overviewDetailMetrics.includes(filters.metric as OverviewDetailMetric)) {
      throw new BadRequestException('Overview KPI metric is invalid');
    }
    const normalizedFilters = this.normalizeFilters(filters);

    try {
      return await this.repository.getOverviewDetails(
        filters.metric as OverviewDetailMetric,
        normalizedFilters,
        accountId,
      );
    } catch (error) {
      this.logger.error(
        'Overview detail query failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Unable to load KPI details');
    }
  }

  private normalizeFilters(filters: OverviewFilterDto): NormalizedOverviewFilters {
    const normalizeMany = (value: unknown, label: string): string[] => {
      if (value === undefined || value === '') return [];
      const values = Array.isArray(value) ? value : [value];
      if (values.some((item) => typeof item !== 'string' || item.length > 200)) {
        throw new BadRequestException(`${label} filter is invalid`);
      }
      return [...new Set(values.map((item) => (item as string).trim()).filter(Boolean))];
    };

    return {
      reportingMonth: this.normalizeReportingMonth(filters.reportingMonth),
      functionName: normalizeMany(filters.functionName, 'Function'),
      orgUnit: normalizeMany(filters.orgUnit, 'Organizational unit'),
      range: normalizeMany(filters.range, 'Range'),
      location: normalizeMany(filters.location, 'Location'),
      gender: normalizeMany(filters.gender, 'Gender'),
      directOrIndirect: normalizeMany(
        filters.directOrIndirect,
        'Direct or indirect',
      ),
    };
  }

  private normalizeReportingMonth(value: unknown): string | null {
    if (value === undefined || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      throw new BadRequestException('Reporting month must use YYYY-MM format');
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (value >= currentMonth) {
      throw new BadRequestException('Historical reporting month must be earlier than the current month');
    }
    return `${value}-01`;
  }
}