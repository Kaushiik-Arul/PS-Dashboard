import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { PppHistoryImportService } from './ppp-history-import.service';
import type { UploadedPppFile } from './ppp-history-import.types';

@ApiTags('HRBP Point - PPP History Imports')
@Controller('hrbp-point/ppp-history-imports')
@RequirePermission('namelist:import')
export class PppHistoryImportController {
  constructor(private readonly service: PppHistoryImportService) {}

  @Post('previews')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and validate employee PPP history' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  createPreview(@UploadedFile() file: UploadedPppFile | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createPreview(file, user.accountId);
  }

  @Get('previews/:previewId/rows')
  getRows(
    @Param('previewId') previewId: string,
    @Query('filter') filter: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getRows(previewId, user.accountId, filter, page, pageSize);
  }

  @Patch('previews/:previewId/rows/:rowNumber')
  updateRow(
    @Param('previewId') previewId: string,
    @Param('rowNumber') rowNumber: string,
    @Body() input: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateRow(previewId, rowNumber, input, user.accountId);
  }

  @Delete('previews/:previewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('previewId') previewId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.cancel(previewId, user.accountId);
  }

  @Post('previews/:previewId/commit')
  commit(
    @Param('previewId') previewId: string,
    @Body('confirmReplacement') confirmReplacement: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.commit(previewId, confirmReplacement, user.accountId);
  }
}