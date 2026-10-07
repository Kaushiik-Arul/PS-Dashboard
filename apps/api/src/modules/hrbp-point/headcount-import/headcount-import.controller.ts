import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { HeadcountImportService } from './headcount-import.service';
import type { UploadedHeadcountFile } from './headcount-import.types';

@ApiTags('HRBP Point - Monthly Headcount Imports')
@Controller('hrbp-point/headcount-imports')
@RequirePermission('headcount:import')
export class HeadcountImportController {
  constructor(private readonly service: HeadcountImportService) {}

  @Post('previews')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Calculate monthly headcounts from a multi-sheet PS Namelist workbook' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  createPreview(@UploadedFile() file: UploadedHeadcountFile | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createPreview(file, user.accountId);
  }

  @Get('previews/:previewId')
  getPreview(@Param('previewId') previewId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getPreview(previewId, user.accountId);
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