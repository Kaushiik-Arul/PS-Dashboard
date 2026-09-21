import { DatabaseService } from '../../database/database.service';
import type { NormalizedOverviewFilters } from './dto/overview-filter.dto';
import { OverviewResponseDto } from './dto/overview-response.dto';
export declare class OverviewRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getOverview(filters: NormalizedOverviewFilters, accountId: string): Promise<OverviewResponseDto>;
}
