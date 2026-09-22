import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HrbpPointController } from './hrbp-point.controller';
import { HrbpPointRepository } from './hrbp-point.repository';
import { HrbpPointService } from './hrbp-point.service';
import { NamelistImportController } from './namelist-import/namelist-import.controller';
import { NamelistImportRepository } from './namelist-import/namelist-import.repository';
import { NamelistImportService } from './namelist-import/namelist-import.service';
import { RbinCleaningController } from './rbin-cleaning/rbin-cleaning.controller';
import { RbinCleaningRepository } from './rbin-cleaning/rbin-cleaning.repository';
import { RbinCleaningService } from './rbin-cleaning/rbin-cleaning.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HrbpPointController, NamelistImportController, RbinCleaningController],
  providers: [
    HrbpPointService,
    HrbpPointRepository,
    NamelistImportService,
    NamelistImportRepository,
    RbinCleaningService,
    RbinCleaningRepository,
  ],
})
export class HrbpPointModule {}