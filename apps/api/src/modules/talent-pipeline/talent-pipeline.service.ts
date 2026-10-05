import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  NormalizedTalentPipelineFilters,
  TalentPipelineFilterDto,
} from './dto/talent-pipeline-filter.dto';
import { TalentPipelineResponseDto } from './dto/talent-pipeline-response.dto';
import { TalentPipelineRepository } from './talent-pipeline.repository';

@Injectable()
export class TalentPipelineService {
  private readonly logger = new Logger(TalentPipelineService.name);

  constructor(private readonly repository: TalentPipelineRepository) {}

  async getTalentPipeline(
    filters: TalentPipelineFilterDto,
    accountId: string,
  ): Promise<TalentPipelineResponseDto> {
    const normalized = this.normalizeFilters(filters);
    try {
      return await this.repository.getTalentPipeline(normalized, accountId);
    } catch {
      this.logger.error('Talent Pipeline database query failed');
      throw new InternalServerErrorException(
        'Unable to load the Talent Pipeline dashboard',
      );
    }
  }

  async getHistoryState(): Promise<{ snapshotMonths: string[] }> {
    try {
      return await this.repository.getHistoryState();
    } catch (error) {
      this.logger.error('Talent Pipeline history state query failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Unable to load Talent Pipeline history');
    }
  }

  async getSnapshot(reportingMonthInput: string): Promise<TalentPipelineResponseDto> {
    const reportingMonth = this.normalizeReportingMonth(reportingMonthInput);
    try {
      const snapshot = await this.repository.getSnapshot(reportingMonth);
      if (!snapshot) throw new NotFoundException('Talent Pipeline snapshot was not found');
      return snapshot;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Talent Pipeline snapshot query failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Unable to load Talent Pipeline snapshot');
    }
  }

  async publishSnapshot(reportingMonthInput: unknown, accountId: string): Promise<{ reportingMonth: string }> {
    const reportingMonth = this.normalizeReportingMonth(reportingMonthInput);
    try {
      return { reportingMonth: await this.repository.publishSnapshot(accountId, reportingMonth) };
    } catch (error) {
      if (error instanceof Error && error.message === 'SNAPSHOT_VERIFICATION_FAILED') {
        throw new ConflictException('The Talent Pipeline snapshot could not be verified.');
      }
      this.logger.error('Talent Pipeline snapshot publication failed', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Unable to save Talent Pipeline snapshot');
    }
  }

  private normalizeReportingMonth(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      throw new BadRequestException('Reporting month must use YYYY-MM format');
    }
    if (value >= new Date().toISOString().slice(0, 7)) {
      throw new BadRequestException('Historical reporting month must be earlier than the current month');
    }
    return `${value}-01`;
  }

  private normalizeFilters(
    filters: TalentPipelineFilterDto,
  ): NormalizedTalentPipelineFilters {
    const normalize = (value: unknown, label: string): string | null => {
      if (value === undefined || value === '') return null;
      if (typeof value !== 'string' || value.length > 200)
        throw new BadRequestException(`${label} filter is invalid`);
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