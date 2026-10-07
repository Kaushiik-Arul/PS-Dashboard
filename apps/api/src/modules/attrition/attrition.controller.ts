import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AttritionService } from './attrition.service';
import { AttritionFilterDto } from './dto/attrition-filter.dto';

@ApiTags('Attrition')
@Controller('attrition')
@RequirePermission('attrition:view')
export class AttritionController {
  constructor(private readonly service: AttritionService) {}

  @Get('filter-options')
  @Header('Cache-Control', 'no-store')
  getFilterOptions(
    @Query() filters: AttritionFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getFilterOptions(user.accountId, filters);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  getRegister(
    @Query() filters: AttritionFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getRegister(user.accountId, filters);
  }
}