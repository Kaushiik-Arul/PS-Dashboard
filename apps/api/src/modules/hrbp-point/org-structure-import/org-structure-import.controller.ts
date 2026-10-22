import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../../auth/auth.decorators';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { OrgStructureImportService } from './org-structure-import.service';
import type { OrgStructureFile } from './org-structure-import.types';

@ApiTags('Org Structure')
@Controller('hrbp-point/org-structure')
export class OrgStructureImportController {
  constructor(private readonly service: OrgStructureImportService) {}

  @Get()
  @RequirePermission('hrbp-point:view')
  @ApiOperation({ summary: 'List current org structure rows' })
  list() {
    return this.service.list();
  }

  @Post('previews')
  @RequirePermission('namelist:import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  createPreview(@UploadedFile() file: OrgStructureFile | undefined, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.createPreview(file, actor.accountId);
  }

  @Get('previews/:id/rows')
  @RequirePermission('namelist:import')
  getRows(@Param('id') id: string, @Query('page') page: string | undefined, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.getRows(id, actor.accountId, page);
  }

  @Patch('previews/:id/rows/:rowNumber')
  @RequirePermission('namelist:import')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateRow(@Param('id') id: string, @Param('rowNumber') rowNumber: string, @Body('values') values: unknown, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.updateRow(id, rowNumber, values, actor.accountId);
  }

  @Delete('previews/:id/rows/:rowNumber')
  @RequirePermission('namelist:import')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRow(@Param('id') id: string, @Param('rowNumber') rowNumber: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.deleteRow(id, rowNumber, actor.accountId);
  }

  @Delete('previews/:id')
  @RequirePermission('namelist:import')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.cancel(id, actor.accountId);
  }

  @Post('previews/:id/commit')
  @RequirePermission('namelist:import')
  commit(@Param('id') id: string, @Body('confirmReplacement') confirmation: unknown, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.commit(id, confirmation, actor.accountId);
  }
}