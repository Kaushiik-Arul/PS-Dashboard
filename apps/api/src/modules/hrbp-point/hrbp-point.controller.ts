import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateEmployeeStatusDto,
  EmployeeStatusResponseDto,
  UpdateEmployeeStatusDto,
} from './dto/employee-status.dto';
import { HrbpPointService } from './hrbp-point.service';

@ApiTags('HRBP Point')
@Controller('hrbp-point/employee-statuses')
export class HrbpPointController {
  constructor(private readonly service: HrbpPointService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List employee leave statuses' })
  @ApiOkResponse({ type: [EmployeeStatusResponseDto] })
  getEmployeeStatuses(): Promise<EmployeeStatusResponseDto[]> {
    return this.service.getEmployeeStatuses();
  }

  @Post()
  @ApiOperation({ summary: 'Create an employee leave status' })
  @ApiCreatedResponse({ type: EmployeeStatusResponseDto })
  @ApiNotFoundResponse({ description: 'Employee number was not found' })
  @ApiConflictResponse({ description: 'Employee status already exists' })
  createEmployeeStatus(
    @Body() input: CreateEmployeeStatusDto,
  ): Promise<EmployeeStatusResponseDto> {
    return this.service.createEmployeeStatus(input);
  }

  @Patch(':persNo')
  @ApiOperation({ summary: 'Update an employee leave status' })
  @ApiOkResponse({ type: EmployeeStatusResponseDto })
  @ApiNotFoundResponse({ description: 'Employee status was not found' })
  updateEmployeeStatus(
    @Param('persNo') persNo: string,
    @Body() input: UpdateEmployeeStatusDto,
  ): Promise<EmployeeStatusResponseDto> {
    return this.service.updateEmployeeStatus(persNo, input);
  }

  @Delete(':persNo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an employee leave status' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Employee status was not found' })
  deleteEmployeeStatus(@Param('persNo') persNo: string): Promise<void> {
    return this.service.deleteEmployeeStatus(persNo);
  }
}