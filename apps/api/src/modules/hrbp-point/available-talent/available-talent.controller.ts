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
import { AvailableTalentService } from './available-talent.service';
import type { AvailableFile } from './available-talent.types';

@ApiTags('STEP-Available Talent')
@Controller('hrbp-point/available-talent')
export class AvailableTalentController {
  constructor(private readonly service: AvailableTalentService) {}
  @Get()
  @RequirePermission('workforce:view')
  list(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.list('available', actor.accountId);
  }
  @Get('employees/:persNo')
  @RequirePermission('namelist:import')
  lookup(@Param('persNo') persNo: string) {
    return this.service.lookup(persNo);
  }
  @Post('rows')
  @RequirePermission('namelist:import')
  add(
    @Body('values') values: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.save('available', actor.accountId, values);
  }
  @Patch('rows/:id')
  @RequirePermission('namelist:import')
  update(
    @Param('id') id: string,
    @Body('values') values: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.save('available', actor.accountId, values, id);
  }
  @Delete('rows/:id')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  remove(@Param('id') id: string) {
    return this.service.remove('available', id);
  }
  @Post('previews')
  @RequirePermission('namelist:import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @UploadedFile() file: AvailableFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.upload('available', actor.accountId, file);
  }
  @Get('previews/:id/rows')
  @RequirePermission('namelist:import')
  preview(
    @Param('id') id: string,
    @Query('filter') filter: string | undefined,
    @Query('page') page: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.preview('available', actor.accountId, id, filter, page);
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
    return this.service.editPreview(
      'available',
      actor.accountId,
      id,
      row,
      values,
    );
  }
  @Delete('previews/:id/rows/:row')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  deletePreviewRow(
    @Param('id') id: string,
    @Param('row') row: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.editPreview('available', actor.accountId, id, row);
  }
  @Delete('previews/:id')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.cancel('available', actor.accountId, id);
  }
  @Post('previews/:id/commit')
  @RequirePermission('namelist:import')
  commit(
    @Param('id') id: string,
    @Body('confirmReplacement') confirmed: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.commit('available', actor.accountId, id, confirmed);
  }
}
