import { Body, Controller, Delete, Get, Header, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  DashboardPreferencesService,
  type OverviewPreferenceResponse,
} from './dashboard-preferences.service';

@ApiTags('Dashboard Preferences')
@Controller('dashboard-preferences')
@RequirePermission('dashboard-customization:manage')
export class DashboardPreferencesController {
  constructor(private readonly service: DashboardPreferencesService) {}

  @Get('overview')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Get the current account Overview layout' })
  getOverview(@CurrentUser() user: AuthenticatedUser): Promise<OverviewPreferenceResponse> {
    return this.service.getOverview(user.accountId);
  }

  @Put('overview')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Save the current account Overview layout' })
  saveOverview(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OverviewPreferenceResponse> {
    return this.service.saveOverview(user.accountId, body);
  }

  @Delete('overview')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Reset the current account Overview layout' })
  resetOverview(@CurrentUser() user: AuthenticatedUser): Promise<OverviewPreferenceResponse> {
    return this.service.resetOverview(user.accountId);
  }
}
