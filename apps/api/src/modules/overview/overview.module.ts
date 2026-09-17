import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OverviewController } from './overview.controller';
import { OverviewRepository } from './overview.repository';
import { OverviewService } from './overview.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OverviewController],
  providers: [OverviewService, OverviewRepository],
})
export class OverviewModule {}