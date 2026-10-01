import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
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