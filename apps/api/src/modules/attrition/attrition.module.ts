import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AttritionController } from './attrition.controller';
import { AttritionService } from './attrition.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AttritionController],
  providers: [AttritionService],
})
export class AttritionModule {}