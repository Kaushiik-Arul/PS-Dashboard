import type { AuthenticatedUser } from '../auth/auth.types';
import { TalentPipelineFilterDto } from './dto/talent-pipeline-filter.dto';
import { TalentPipelineResponseDto } from './dto/talent-pipeline-response.dto';
import { TalentPipelineService } from './talent-pipeline.service';
export declare class TalentPipelineController {
    private readonly service;
    constructor(service: TalentPipelineService);
    getTalentPipeline(filters: TalentPipelineFilterDto, user: AuthenticatedUser): Promise<TalentPipelineResponseDto>;
}
