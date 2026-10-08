import { OverviewResponseDto } from './dto/overview-response.dto';
import { type OverviewDetailsFilterDto, type OverviewFilterDto } from './dto/overview-filter.dto';
import type { OverviewEmployeeDetailDto } from './dto/overview-response.dto';
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
    getOverviewDetails(filters: OverviewDetailsFilterDto, accountId: string): Promise<OverviewEmployeeDetailDto[]>;
    private normalizeFilters;
    private normalizeReportingMonth;
}
