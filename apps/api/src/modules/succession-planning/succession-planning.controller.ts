import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SuccessionPlanningService } from './succession-planning.service';

@ApiTags('Succession Planning')
@Controller('succession-planning')
export class SuccessionPlanningController {
  constructor(private readonly service: SuccessionPlanningService) {}

  @Get()
  @RequirePermission('succession-planning:view')
  getRegister(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getRegister(user.accountId);
  }
}
