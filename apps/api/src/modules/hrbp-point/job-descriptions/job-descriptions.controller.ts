import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { JobDescriptionsService } from './job-descriptions.service';

@ApiTags('HRBP Point - Job Descriptions')
@Controller('hrbp-point/job-descriptions')
@RequirePermission('hrbp-point:manage')
export class JobDescriptionsController {
  constructor(private readonly service: JobDescriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and page job descriptions' })
  list(@Query('search') search?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.list(search, page, pageSize);
  }

  @Get('by-suffix')
  @ApiOperation({ summary: 'Find job descriptions by the last three digits of the JD ID' })
  findBySuffix(@Query('suffix') suffix: string) {
    return this.service.findBySuffix(suffix);
  }

  @Post()
  @ApiOperation({ summary: 'Create a job description' })
  create(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(body, user.accountId);
  }

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import JD ID and Role Title mappings from CSV' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  importCsv(@UploadedFile() file: { originalname: string; buffer: Buffer } | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.importCsv(file, user.accountId);
  }

  @Patch(':jobDescriptionId')
  @ApiOperation({ summary: 'Update a job description' })
  update(@Param('jobDescriptionId') id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, body, user.accountId);
  }

  @Delete(':jobDescriptionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a job description' })
  delete(@Param('jobDescriptionId') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.service.delete(id, user.accountId);
  }
}
