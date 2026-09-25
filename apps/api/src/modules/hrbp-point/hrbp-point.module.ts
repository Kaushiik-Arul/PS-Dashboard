import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HrbpPointController } from './hrbp-point.controller';
import { HrbpPointRepository } from './hrbp-point.repository';
import { HrbpPointService } from './hrbp-point.service';
import { NamelistImportController } from './namelist-import/namelist-import.controller';
import { NamelistImportRepository } from './namelist-import/namelist-import.repository';
import { NamelistImportService } from './namelist-import/namelist-import.service';
import { PppHistoryImportController } from './ppp-history-import/ppp-history-import.controller';
import { PppHistoryImportRepository } from './ppp-history-import/ppp-history-import.repository';
import { PppHistoryImportService } from './ppp-history-import/ppp-history-import.service';
import { RbinCleaningController } from './rbin-cleaning/rbin-cleaning.controller';
import { RbinCleaningRepository } from './rbin-cleaning/rbin-cleaning.repository';
import { RbinCleaningService } from './rbin-cleaning/rbin-cleaning.service';
import { RbinExceptionsController } from './rbin-exceptions/rbin-exceptions.controller';
import { RbinExceptionsRepository } from './rbin-exceptions/rbin-exceptions.repository';
import { RbinExceptionsService } from './rbin-exceptions/rbin-exceptions.service';
import { RbinMappingsController } from './rbin-mappings/rbin-mappings.controller';
import { RbinMappingsRepository } from './rbin-mappings/rbin-mappings.repository';
import { RbinMappingsService } from './rbin-mappings/rbin-mappings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HrbpPointController, NamelistImportController, PppHistoryImportController, RbinCleaningController, RbinMappingsController, RbinExceptionsController],
  providers: [
    HrbpPointService,
    HrbpPointRepository,
    NamelistImportService,
    NamelistImportRepository,
    PppHistoryImportService,
    PppHistoryImportRepository,
    RbinCleaningService,
    RbinCleaningRepository,
    RbinMappingsService,
    RbinMappingsRepository,
    RbinExceptionsService,
    RbinExceptionsRepository,
  ],
})
export class HrbpPointModule {}