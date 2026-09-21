import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HrbpPointController } from './hrbp-point.controller';
import { HrbpPointRepository } from './hrbp-point.repository';
import { HrbpPointService } from './hrbp-point.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HrbpPointController],
  providers: [HrbpPointService, HrbpPointRepository],
})
export class HrbpPointModule {}