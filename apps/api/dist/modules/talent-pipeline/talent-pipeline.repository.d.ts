import { DatabaseService } from '../../database/database.service';
import type { NormalizedTalentPipelineFilters } from './dto/talent-pipeline-filter.dto';
import { TalentPipelineResponseDto } from './dto/talent-pipeline-response.dto';
export declare class TalentPipelineRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getTalentPipeline(filters: NormalizedTalentPipelineFilters, accountId: string): Promise<TalentPipelineResponseDto>;
    getHistoryState(): Promise<{
        snapshotMonths: string[];
    }>;
    getSnapshot(reportingMonth: string): Promise<TalentPipelineResponseDto | null>;
    publishSnapshot(accountId: string, reportingMonth: string): Promise<string>;
    private queryDashboard;
}
