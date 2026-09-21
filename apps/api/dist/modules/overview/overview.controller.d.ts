import { OverviewResponseDto } from './dto/overview-response.dto';
import { OverviewFilterDto } from './dto/overview-filter.dto';
import { OverviewService } from './overview.service';
export declare class OverviewController {
    private readonly service;
    constructor(service: OverviewService);
    getOverview(filters: OverviewFilterDto): Promise<OverviewResponseDto>;
}
