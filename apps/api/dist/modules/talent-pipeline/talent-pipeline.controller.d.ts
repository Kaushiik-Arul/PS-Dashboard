import type { AuthenticatedUser } from '../auth/auth.types';
import { TalentPipelineFilterDto } from './dto/talent-pipeline-filter.dto';
import { TalentPipelineResponseDto } from './dto/talent-pipeline-response.dto';
import { TalentPipelineService } from './talent-pipeline.service';
export declare class TalentPipelineController {
    private readonly service;
    constructor(service: TalentPipelineService);
    getHistoryState(): Promise<{
        snapshotMonths: string[];
    }>;
    getSnapshot(reportingMonth: string): Promise<TalentPipelineResponseDto>;
    publishSnapshot(reportingMonth: unknown, user: AuthenticatedUser): Promise<{
        reportingMonth: string;
    }>;
    getTalentPipeline(filters: TalentPipelineFilterDto, user: AuthenticatedUser): Promise<TalentPipelineResponseDto>;
}
