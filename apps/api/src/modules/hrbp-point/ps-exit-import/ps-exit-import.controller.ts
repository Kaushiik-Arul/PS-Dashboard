import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import type { AttritionFile } from '../attrition-import/attrition-import.types';
import { PsExitImportService } from './ps-exit-import.service';

@ApiTags('PS Exit Import')
@Controller('hrbp-point/ps-exit')
@RequirePermission('attrition:import')
export class PsExitImportController {
  constructor(private readonly service: PsExitImportService) {}

  @Post('previews')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  upload(@UploadedFile() file: AttritionFile | undefined, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.upload(actor.accountId, file);
  }

  @Get('previews/:id/rows')
  preview(@Param('id') id: string, @Query('filter') filter: string | undefined, @Query('period') period: string | undefined, @Query('page') page: string | undefined, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.preview(actor.accountId, id, filter, period, page);
  }

  @Patch('previews/:id/rows/:row')
  @HttpCode(204)
  edit(@Param('id') id: string, @Param('row') row: string, @Body('values') values: unknown, @CurrentUser() actor: AuthenticatedUser) {
    if (values === undefined) throw new BadRequestException('Row values are required.');
    return this.service.editPreview(actor.accountId, id, row, values);
  }

  @Delete('previews/:id/rows/:row')
  @HttpCode(204)
  deleteRow(@Param('id') id: string, @Param('row') row: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.editPreview(actor.accountId, id, row);
  }

  @Delete('previews/:id')
  @HttpCode(204)
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.cancel(actor.accountId, id);
  }

  @Post('previews/:id/commit')
  commit(@Param('id') id: string, @Body('confirmed') confirmed: unknown, @Body('period') period: unknown, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.commit(actor.accountId, id, confirmed, period);
  }
}