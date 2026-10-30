import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MrmCalculationRepository } from './mrm-calculation.repository';
import { MrmCalculationService } from './mrm-calculation.service';
import { MrmController } from './mrm.controller';
import { MrmRepository } from './mrm.repository';
import { MrmService } from './mrm.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MrmController],
  providers: [
    MrmRepository,
    MrmService,
    MrmCalculationRepository,
    MrmCalculationService,
  ],
  exports: [MrmCalculationService],
})
export class MrmModule {}