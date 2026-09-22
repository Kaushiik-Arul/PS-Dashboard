import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Employee360Service } from './employee-360.service';
import { Employee360QueryDto, Employee360ResponseDto } from './dto/employee-360.dto';

@ApiTags('Employee 360')
@Controller('employee-360')
@RequirePermission('workforce:view')
export class Employee360Controller {
  constructor(private readonly service: Employee360Service) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'List employees within the authenticated workforce scope' })
  @ApiOkResponse({ type: Employee360ResponseDto })
  getEmployees(
    @Query() query: Employee360QueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Employee360ResponseDto> {
    return this.service.getEmployees(query, user);
  }
}