import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { RbinExceptionsService } from './rbin-exceptions.service';

@ApiTags('HRBP Point - RBIN Exceptions')
@Controller('hrbp-point/rbin-exceptions')
@RequirePermission('namelist:transform')
export class RbinExceptionsController {
  constructor(private readonly service: RbinExceptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Search, filter, and page RBIN employee exceptions' })
  list(@Query('search') search?: string, @Query('filter') filter?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.list(search, filter, page, pageSize);
  }

  @Post()
  @ApiOperation({ summary: 'Create RBIN employee exceptions for multiple columns' })
  create(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(body, user.accountId);
  }

  @Patch(':exceptionId')
  @ApiOperation({ summary: 'Update an RBIN employee exception' })
  update(@Param('exceptionId') exceptionId: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(exceptionId, body, user.accountId);
  }

  @Delete(':exceptionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an RBIN employee exception' })
  delete(@Param('exceptionId') exceptionId: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.service.delete(exceptionId, user.accountId);
  }
}