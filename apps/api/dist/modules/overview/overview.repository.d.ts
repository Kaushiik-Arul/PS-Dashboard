import { DatabaseService } from '../../database/database.service';
import { OverviewResponseDto } from './dto/overview-response.dto';
export declare class OverviewRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getOverview(): Promise<OverviewResponseDto>;
}
