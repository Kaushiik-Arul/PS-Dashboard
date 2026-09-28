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
import { PoolRegisterService } from './pool-register.service';
import type { PoolFile } from './pool-register.types';

@ApiTags('Pool registers')
@Controller('hrbp-point/pool-registers/:kind')
export class PoolRegisterController {
  constructor(private readonly service: PoolRegisterService) {}
  @Get()
  @RequirePermission('workforce:view')
  list(@Param('kind') kind: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.list(this.service.kind(kind), actor.accountId);
  }
  @Get('employees/:persNo')
  @RequirePermission('namelist:import')
  lookup(@Param('kind') kind: string, @Param('persNo') persNo: string) {
    this.service.kind(kind);
    return this.service.lookup(persNo);
  }
  @Post('rows')
  @RequirePermission('namelist:import')
  add(
    @Param('kind') kind: string,
    @Body('values') values: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.save(this.service.kind(kind), actor.accountId, values);
  }
  @Patch('rows/:id')
  @RequirePermission('namelist:import')
  update(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body('values') values: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.save(
      this.service.kind(kind),
      actor.accountId,
      values,
      id,
    );
  }
  @Delete('rows/:id')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  remove(@Param('kind') kind: string, @Param('id') id: string) {
    return this.service.remove(this.service.kind(kind), id);
  }
  @Post('previews')
  @RequirePermission('namelist:import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @Param('kind') kind: string,
    @UploadedFile() file: PoolFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.upload(this.service.kind(kind), actor.accountId, file);
  }
  @Get('previews/:id/rows')
  @RequirePermission('namelist:import')
  preview(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Query('filter') filter: string | undefined,
    @Query('page') page: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.preview(
      this.service.kind(kind),
      actor.accountId,
      id,
      filter,
      page,
    );
  }
  @Patch('previews/:id/rows/:row')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  editPreview(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Param('row') row: string,
    @Body('values') values: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (values === undefined)
      throw new BadRequestException('Row values are required.');
    return this.service.editPreview(
      this.service.kind(kind),
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
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Param('row') row: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.editPreview(
      this.service.kind(kind),
      actor.accountId,
      id,
      row,
    );
  }
  @Delete('previews/:id')
  @HttpCode(204)
  @RequirePermission('namelist:import')
  cancel(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.cancel(this.service.kind(kind), actor.accountId, id);
  }
  @Post('previews/:id/commit')
  @RequirePermission('namelist:import')
  commit(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body('confirmReplacement') confirmed: unknown,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.commit(
      this.service.kind(kind),
      actor.accountId,
      id,
      confirmed,
    );
  }
}
