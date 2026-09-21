import { OverviewResponseDto } from './dto/overview-response.dto';
import { type OverviewFilterDto } from './dto/overview-filter.dto';
import { OverviewRepository } from './overview.repository';
export declare class OverviewService {
    private readonly repository;
    private readonly logger;
    constructor(repository: OverviewRepository);
    getOverview(filters?: OverviewFilterDto): Promise<OverviewResponseDto>;
    private normalizeFilters;
}
