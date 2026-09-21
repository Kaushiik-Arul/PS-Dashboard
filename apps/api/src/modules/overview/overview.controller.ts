import { Controller, Get, Header, Query } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OverviewResponseDto } from './dto/overview-response.dto';
import { OverviewFilterDto } from './dto/overview-filter.dto';
import { OverviewService } from './overview.service';

@ApiTags('Overview')
@Controller('overview')
export class OverviewController {
  constructor(private readonly service: OverviewService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Fetch overview KPIs and chart data' })
  @ApiOkResponse({
    description: 'Calculated workforce overview',
    type: OverviewResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unable to load the workforce overview',
  })
  getOverview(@Query() filters: OverviewFilterDto): Promise<OverviewResponseDto> {
    return this.service.getOverview(filters);
  }
}