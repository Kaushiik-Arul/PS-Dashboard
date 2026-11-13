import { Controller, Delete, Get, HttpCode, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { AttritionMovementsService } from './attrition-movements.service';

@ApiTags('HRBP Point - Attrition Movements')
@Controller('hrbp-point/attrition-movements')
@RequirePermission('attrition:view')
export class AttritionMovementsController {
  constructor(private readonly service: AttritionMovementsService) {}

  @Get()
  @ApiOperation({ summary: 'Search, filter, and page RBIN attrition movements' })
  list(
    @Query('view') view?: string,
    @Query('search') search?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list(view, search, year, month, page, pageSize);
  }

  @Delete('candidates/:candidateId')
  @HttpCode(204)
  @RequirePermission('attrition:import')
  dismissCandidate(@Param('candidateId') candidateId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.dismissCandidate(candidateId, actor.accountId);
  }
}