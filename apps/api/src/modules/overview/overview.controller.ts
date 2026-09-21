import { Controller, Get, Header, Query } from '@nestjs/common';
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