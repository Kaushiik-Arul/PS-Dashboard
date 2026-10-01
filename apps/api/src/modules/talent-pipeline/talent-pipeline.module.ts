import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TalentPipelineController } from './talent-pipeline.controller';
import { TalentPipelineRepository } from './talent-pipeline.repository';
import { TalentPipelineService } from './talent-pipeline.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TalentPipelineController],
  providers: [TalentPipelineService, TalentPipelineRepository],
})
export class TalentPipelineModule {}