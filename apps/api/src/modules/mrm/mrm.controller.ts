import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { parseMrmGenderHiring } from './mrm-gender-hiring.parser';
import { MrmCalculationRepository } from './mrm-calculation.repository';
import { parseMrmPul } from './mrm-pul.parser';
import { MrmService } from './mrm.service';
import type { MrmUploadedFile } from './mrm.types';

@ApiTags('MRM')
@Controller('mrm')
@RequirePermission('mrm:view')
export class MrmController {
  constructor(
    private readonly service: MrmService,
    private readonly calculationRepository: MrmCalculationRepository,
  ) {}

  @Post('gender-hiring-value')
  @RequirePermission('mrm:manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  async readGenderHiringValue(
    @Body('dataMonth') dataMonth: unknown,
    @UploadedFile() file: MrmUploadedFile | undefined,
  ) {
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('Gender hiring file is required.');
    if (typeof dataMonth !== 'string') throw new BadRequestException('Data month is required.');
    return parseMrmGenderHiring(file.buffer, dataMonth, await this.calculationRepository.getOrgUnitRanges());
  }

  @Get('months')
  @Header('Cache-Control', 'no-store')
  listMonths() {
    return this.service.listMonths();
  }

  @Post('pul-value')
  @RequirePermission('mrm:manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  async readPulValue(
    @Body('dataMonth') dataMonth: unknown,
    @UploadedFile() file: MrmUploadedFile | undefined,
  ) {
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('PUL file is required.');
    if (typeof dataMonth !== 'string') throw new BadRequestException('Data month is required.');
    return parseMrmPul(file.buffer, dataMonth);
  }

  @Get('reports/:reportingMonth')
  @Header('Cache-Control', 'no-store')
  getReport(
    @Param('reportingMonth') reportingMonth: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getReport(reportingMonth, user);
  }

  @Patch('reports/:reportingMonth')
  @RequirePermission('mrm:manage')
  saveReport(
    @Param('reportingMonth') reportingMonth: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.saveReport(reportingMonth, user, body);
  }

  @Post('reports/:reportingMonth/finalize')
  @RequirePermission('mrm:manage')
  finalize(
    @Param('reportingMonth') reportingMonth: string,
    @Body('expectedRevision') expectedRevision: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.finalize(reportingMonth, user, expectedRevision);
  }

  @Post('reports/:reportingMonth/attachments')
  @RequirePermission('mrm:manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  uploadAttachment(
    @Param('reportingMonth') reportingMonth: string,
    @Body('rowKey') rowKey: unknown,
    @Body('columnKey') columnKey: unknown,
    @UploadedFile() file: MrmUploadedFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.uploadAttachment(reportingMonth, user, rowKey, columnKey, file);
  }

  @Get('reports/:reportingMonth/attachments/:attachmentId')
  async downloadAttachment(
    @Param('reportingMonth') reportingMonth: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const attachment = await this.service.downloadAttachment(reportingMonth, attachmentId, user);
    const filename = attachment.filename.replace(/[\r\n"]/g, '_');
    response.setHeader('Content-Type', attachment.mime_type);
    response.setHeader('Content-Length', String(attachment.size_bytes));
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.setHeader('Cache-Control', 'private, no-store');
    return attachment.content;
  }

  @Delete('reports/:reportingMonth/attachments/:attachmentId')
  @HttpCode(204)
  @RequirePermission('mrm:manage')
  deleteAttachment(
    @Param('reportingMonth') reportingMonth: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deleteAttachment(reportingMonth, attachmentId, user);
  }
}