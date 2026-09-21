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
  Query,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser, RequestMetadata } from '../auth/auth.types';
import { AccessPointService } from './access-point.service';
import {
  AccessAssignmentDto,
  CreateAccessAssignmentDto,
  EmployeeCandidateDto,
  UpdateAccessAssignmentDto,
} from './dto/access-point.dto';

function requestMetadata(request: Request): RequestMetadata {
  return {
    ipAddress: request.ip || null,
    userAgent: typeof request.headers['user-agent'] === 'string'
      ? request.headers['user-agent'].slice(0, 500)
      : null,
  };
}

@ApiTags('Access Point')
@Controller('access-point')
@RequirePermission('access-point:manage')
export class AccessPointController {
  constructor(private readonly service: AccessPointService) {}

  @Get('employees')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ type: [EmployeeCandidateDto] })
  searchEmployees(@Query('query') query: string) {
    return this.service.searchEmployees(query);
  }

  @Get('scope-options')
  @Header('Cache-Control', 'private, no-store')
  getScopeOptions(@Query('range') range?: string) {
    return this.service.getScopeOptions(range);
  }

  @Get('assignments')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ type: [AccessAssignmentDto] })
  listAssignments() {
    return this.service.listAssignments();
  }

  @Post('assignments')
  @Header('Cache-Control', 'private, no-store')
  @ApiCreatedResponse({ type: AccessAssignmentDto })
  createAssignment(
    @Body() input: CreateAccessAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.createAssignment(input, user.accountId, requestMetadata(request));
  }

  @Patch('assignments/:assignmentId')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ type: AccessAssignmentDto })
  updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() input: UpdateAccessAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.updateAssignment(
      assignmentId,
      input,
      user.accountId,
      requestMetadata(request),
    );
  }

  @Delete('accounts/:accountId')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deactivateAccount(
    @Param('accountId') accountId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.service.deactivateAccount(
      accountId,
      user.accountId,
      requestMetadata(request),
    );
  }
}
