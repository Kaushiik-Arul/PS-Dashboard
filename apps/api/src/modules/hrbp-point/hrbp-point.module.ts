import { AvailableTalentController } from './available-talent/available-talent.controller';
import { AvailableTalentService } from './available-talent/available-talent.service';
import { PoolRegisterController } from './pool-register/pool-register.controller';
import { PoolRegisterService } from './pool-register/pool-register.service';
import { NominationStatusController } from './nomination-status/nomination-status.controller';
import { NominationStatusService } from './nomination-status/nomination-status.service';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ActiveStepController } from './active-step/active-step.controller';
import { ActiveStepService } from './active-step/active-step.service';
import { ActiveStepRepository } from './active-step/active-step.repository';
import { EmployeeJdImportController } from './employee-jd-import/employee-jd-import.controller';
import { EmployeeJdImportRepository } from './employee-jd-import/employee-jd-import.repository';
import { EmployeeJdImportService } from './employee-jd-import/employee-jd-import.service';
import { EmployeeJdMovementsController } from './employee-jd-movements/employee-jd-movements.controller';
import { EmployeeJdMovementsRepository } from './employee-jd-movements/employee-jd-movements.repository';
import { EmployeeJdMovementsService } from './employee-jd-movements/employee-jd-movements.service';
import { HrbpPointController } from './hrbp-point.controller';
import { HrbpPointRepository } from './hrbp-point.repository';
import { HrbpPointService } from './hrbp-point.service';
import { HeadcountImportController } from './headcount-import/headcount-import.controller';
import { HeadcountImportRepository } from './headcount-import/headcount-import.repository';
import { HeadcountImportService } from './headcount-import/headcount-import.service';
import { JobDescriptionsController } from './job-descriptions/job-descriptions.controller';
import { JobDescriptionsRepository } from './job-descriptions/job-descriptions.repository';
import { JobDescriptionsService } from './job-descriptions/job-descriptions.service';
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
import { SuccessionPlanningImportController } from './succession-planning-import/succession-planning-import.controller';
import { SuccessionPlanningImportService } from './succession-planning-import/succession-planning-import.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AvailableTalentController, PoolRegisterController, NominationStatusController, ActiveStepController, EmployeeJdImportController, EmployeeJdMovementsController, HrbpPointController, HeadcountImportController, JobDescriptionsController, NamelistImportController, PppHistoryImportController, RbinCleaningController, RbinMappingsController, RbinExceptionsController, SuccessionPlanningImportController],
  providers: [AvailableTalentService,
    PoolRegisterService,
    NominationStatusService,
    ActiveStepService,
    ActiveStepRepository,
    EmployeeJdImportService,
    EmployeeJdImportRepository,
    EmployeeJdMovementsService,
    EmployeeJdMovementsRepository,
    HrbpPointService,
    HrbpPointRepository,
    HeadcountImportService,
    HeadcountImportRepository,
    JobDescriptionsService,
    JobDescriptionsRepository,
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
    SuccessionPlanningImportService,
  ],
})
export class HrbpPointModule {}