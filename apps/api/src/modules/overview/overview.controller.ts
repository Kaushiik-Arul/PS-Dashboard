import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { OverviewResponseDto } from './dto/overview-response.dto';
import { OverviewFilterDto } from './dto/overview-filter.dto';
import { OverviewService } from './overview.service';

@ApiTags('Overview')
@Controller('overview')
@RequirePermission('workforce:view')
export class OverviewController {
  constructor(private readonly service: OverviewService) {}

  @Get('available-months')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List available historical Overview months' })
  getAvailableMonths(): Promise<{ currentMonth: string | null; detailedMonths: string[] }> {
    return this.service.getAvailableMonths();
  }

  @Get('archived-months')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('dashboard-history:view')
  @ApiOperation({ summary: 'List HRBP-only archived Overview months' })
  getArchivedMonths(): Promise<string[]> {
    return this.service.getArchivedMonths();
  }

  @Get('archive/:reportingMonth')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('dashboard-history:view')
  @ApiOperation({ summary: 'Fetch an HRBP-only archived Overview snapshot' })
  getArchivedOverview(@Param('reportingMonth') reportingMonth: string): Promise<OverviewResponseDto> {
    return this.service.getArchivedOverview(reportingMonth);
  }

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
  getOverview(
    @Query() filters: OverviewFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OverviewResponseDto> {
    return this.service.getOverview(filters, user.accountId);
  }
}