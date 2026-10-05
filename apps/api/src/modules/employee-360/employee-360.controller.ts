import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
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

  @Get(':persNo')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Get an employee profile and Career Journey within the authenticated workforce scope' })
  getProfile(@Param('persNo') persNo: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getProfile(persNo, user);
  }

  @Post(':persNo/career-journey')
  @RequirePermission('workforce:edit')
  createCareerEvent(@Param('persNo') persNo: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createCareerEvent(persNo, body, user);
  }

  @Patch(':persNo/job-description')
  @RequirePermission('workforce:edit')
  updateJobDescription(@Param('persNo') persNo: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateJobDescription(persNo, body, user);
  }

  @Patch(':persNo/step-availability')
  @RequirePermission('workforce:edit')
  updateStepAvailability(@Param('persNo') persNo: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateStepAvailability(persNo, body, user);
  }

  @Patch(':persNo/career-journey/:eventId')
  @RequirePermission('workforce:edit')
  updateCareerEvent(@Param('persNo') persNo: string, @Param('eventId') eventId: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateCareerEvent(persNo, eventId, body, user);
  }

  @Delete(':persNo/career-journey/:eventId')
  @RequirePermission('workforce:edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCareerEvent(@Param('persNo') persNo: string, @Param('eventId') eventId: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.service.deleteCareerEvent(persNo, eventId, user);
  }
}