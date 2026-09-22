import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { RbinMappingsService } from './rbin-mappings.service';

@ApiTags('HRBP Point - RBIN Mappings')
@Controller('hrbp-point/rbin-mappings')
@RequirePermission('namelist:transform')
export class RbinMappingsController {
  constructor(private readonly service: RbinMappingsService) {}

  @Get(':kind')
  @ApiOperation({ summary: 'Search and page RBIN Organizational Unit mappings' })
  list(@Param('kind') kind: string, @Query('search') search?: string, @Query('filter') filter?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.list(kind, search, filter, page, pageSize);
  }

  @Post(':kind')
  @ApiOperation({ summary: 'Create an RBIN Organizational Unit mapping' })
  create(@Param('kind') kind: string, @Body() body: unknown) {
    return this.service.create(kind, body);
  }

  @Patch(':kind/:mappingId')
  @ApiOperation({ summary: 'Update an RBIN Organizational Unit mapping' })
  update(@Param('kind') kind: string, @Param('mappingId') mappingId: string, @Body() body: unknown) {
    return this.service.update(kind, mappingId, body);
  }

  @Delete(':kind/:mappingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an RBIN Organizational Unit mapping' })
  delete(@Param('kind') kind: string, @Param('mappingId') mappingId: string): Promise<void> {
    return this.service.delete(kind, mappingId);
  }
}