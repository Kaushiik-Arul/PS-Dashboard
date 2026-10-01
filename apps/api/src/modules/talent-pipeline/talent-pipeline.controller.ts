import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TalentPipelineFilterDto } from './dto/talent-pipeline-filter.dto';
import { TalentPipelineResponseDto } from './dto/talent-pipeline-response.dto';
import { TalentPipelineService } from './talent-pipeline.service';

@ApiTags('Talent Pipeline')
@Controller('talent-pipeline')
@RequirePermission('workforce:view')
export class TalentPipelineController {
  constructor(private readonly service: TalentPipelineService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Fetch Talent Pipeline KPIs and chart data' })
  @ApiOkResponse({ type: TalentPipelineResponseDto })
  getTalentPipeline(
    @Query() filters: TalentPipelineFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getTalentPipeline(filters, user.accountId);
  }
}