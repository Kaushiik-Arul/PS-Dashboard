import type { TalentPipelineFilterDto } from './dto/talent-pipeline-filter.dto';
import { TalentPipelineResponseDto } from './dto/talent-pipeline-response.dto';
import { TalentPipelineRepository } from './talent-pipeline.repository';
export declare class TalentPipelineService {
    private readonly repository;
    private readonly logger;
    constructor(repository: TalentPipelineRepository);
    getTalentPipeline(filters: TalentPipelineFilterDto, accountId: string): Promise<TalentPipelineResponseDto>;
    getHistoryState(): Promise<{
        snapshotMonths: string[];
    }>;
    getSnapshot(reportingMonthInput: string): Promise<TalentPipelineResponseDto>;
    publishSnapshot(reportingMonthInput: unknown, accountId: string): Promise<{
        reportingMonth: string;
    }>;
    private normalizeReportingMonth;
    private normalizeFilters;
}
