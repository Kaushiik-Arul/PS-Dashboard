import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { NominationStatusService } from './nomination-status.service';
import type { NominationStatusFile } from './nomination-status.types';

@ApiTags('Nomination status')
@Controller('hrbp-point/nomination-status')
export class NominationStatusController {
  constructor(private readonly service: NominationStatusService) {}

  @Post('previews')
  @RequirePermission('namelist:import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @UploadedFile() file: NominationStatusFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.upload(actor.accountId, file);
  }

  @Get('previews/:id/rows')
  @RequirePermission('namelist:import')
  preview(
    @Param('id') id: string,
    @Query('filter') filter: string | undefined,
    @Query('page') page: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.preview(actor.accountId, id, filter, page);
  }

  @Patch('previews/:id/rows/:row')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  editPreview(
    @Param('id') id: string,
    @Param('row') row: string,
    @Body('values') values: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (values === undefined)
      throw new BadRequestException('Row values are required.');
    return this.service.editPreview(actor.accountId, id, row, values);
  }

  @Delete('previews/:id/rows/:row')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  deletePreviewRow(
    @Param('id') id: string,
    @Param('row') row: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.editPreview(actor.accountId, id, row);
  }

  @Delete('previews/:id')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  cancel(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.cancel(actor.accountId, id);
  }

  @Post('previews/:id/commit')
  @RequirePermission('namelist:import')
  commit(
    @Param('id') id: string,
    @Body('confirmReplacement') confirmed: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.commit(actor.accountId, id, confirmed);
  }
}