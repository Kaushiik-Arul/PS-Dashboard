import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { EmployeeJdMovementsService } from './employee-jd-movements.service';

@ApiTags('HRBP Point - Employee JD Movements')
@Controller('hrbp-point/employee-jd-movements')
@RequirePermission('hrbp-point:manage')
export class EmployeeJdMovementsController {
  constructor(private readonly service: EmployeeJdMovementsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and page employee JD movements' })
  list(
    @Query('search') search?: string,
    @Query('source') source?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list(search, source, fromDate, toDate, role, page, pageSize);
  }
}