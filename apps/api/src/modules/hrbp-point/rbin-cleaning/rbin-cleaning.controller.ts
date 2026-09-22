import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { RbinCleaningService } from './rbin-cleaning.service';
import type { UploadedRbinFile } from './rbin-cleaning.types';

@ApiTags('HRBP Point - RBIN Cleaning')
@Controller('hrbp-point/rbin-cleaning')
@RequirePermission('namelist:transform')
export class RbinCleaningController {
  constructor(private readonly service: RbinCleaningService) {}

  @Post('batches')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload, transform, and stage an RBIN namelist' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  createBatch(@UploadedFile() file: UploadedRbinFile | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createPreview(file, user.accountId);
  }

  @Get('batches')
  listBatches(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listBatches(user.accountId);
  }

  @Get('batches/:batchId/rows')
  getRows(
    @Param('batchId') batchId: string,
    @Query('filter') filter: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
    @Query('search') search: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getRows(batchId, user.accountId, filter, page, pageSize, search);
  }

  @Patch('batches/:batchId/rows/:rowNumber')
  updateRow(
    @Param('batchId') batchId: string,
    @Param('rowNumber') rowNumber: string,
    @Body() input: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateRow(batchId, rowNumber, input, user.accountId);
  }

  @Post('batches/:batchId/finalize')
  finalize(@Param('batchId') batchId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.finalize(batchId, user.accountId);
  }

  @Post('batches/:batchId/export')
  @RequirePermission('namelist:export')
  async export(@Param('batchId') batchId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.service.exportBatch(batchId, user.accountId);
    return new StreamableFile(result.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${result.fileName}"`,
      length: result.buffer.length,
    });
  }
}