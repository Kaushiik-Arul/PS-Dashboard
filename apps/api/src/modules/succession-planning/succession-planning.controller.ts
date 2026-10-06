import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SuccessionPlanningFilterDto } from './dto/succession-planning-filter.dto';
import { SuccessionPlanningService } from './succession-planning.service';

@ApiTags('Succession Planning')
@Controller('succession-planning')
@RequirePermission('succession-planning:view')
export class SuccessionPlanningController {
  constructor(private readonly service: SuccessionPlanningService) {}

  @Get('history')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('dashboard-history:view')
  getHistoryState() {
    return this.service.getHistoryState();
  }

  @Get('history/:reportingMonth')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('dashboard-history:view')
  getSnapshot(@Param('reportingMonth') reportingMonth: string) {
    return this.service.getSnapshot(reportingMonth);
  }

  @Post('snapshots')
  @Header('Cache-Control', 'no-store')
  @RequirePermission('dashboard-history:view')
  publishSnapshot(
    @Body('reportingMonth') reportingMonth: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.publishSnapshot(reportingMonth, user.accountId);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @RequirePermission('succession-planning:view')
  getRegister(
    @Query() filters: SuccessionPlanningFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getRegister(user.accountId, filters);
  }
}
