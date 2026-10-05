import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SuccessionPlanningController } from './succession-planning.controller';
import { SuccessionPlanningService } from './succession-planning.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SuccessionPlanningController],
  providers: [SuccessionPlanningService],
})
export class SuccessionPlanningModule {}
