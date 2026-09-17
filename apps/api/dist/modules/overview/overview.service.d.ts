import { OverviewResponseDto } from './dto/overview-response.dto';
import { OverviewRepository } from './overview.repository';
export declare class OverviewService {
    private readonly repository;
    private readonly logger;
    constructor(repository: OverviewRepository);
    getOverview(): Promise<OverviewResponseDto>;
}
