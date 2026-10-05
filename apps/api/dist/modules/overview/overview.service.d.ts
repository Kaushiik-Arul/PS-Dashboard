import { OverviewResponseDto } from './dto/overview-response.dto';
import { type OverviewFilterDto } from './dto/overview-filter.dto';
import { OverviewRepository } from './overview.repository';
export declare class OverviewService {
    private readonly repository;
    private readonly logger;
    constructor(repository: OverviewRepository);
    getAvailableMonths(): Promise<{
        currentMonth: string | null;
        detailedMonths: string[];
    }>;
    getArchivedMonths(): Promise<string[]>;
    getArchivedOverview(reportingMonthInput: string): Promise<OverviewResponseDto>;
    getOverview(filters: OverviewFilterDto, accountId: string): Promise<OverviewResponseDto>;
    private normalizeFilters;
    private normalizeReportingMonth;
}
