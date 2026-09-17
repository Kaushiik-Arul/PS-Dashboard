import { OverviewResponseDto } from './dto/overview-response.dto';
import { OverviewService } from './overview.service';
export declare class OverviewController {
    private readonly service;
    constructor(service: OverviewService);
    getOverview(): Promise<OverviewResponseDto>;
}
