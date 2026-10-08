import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DashboardPreferencesController } from './dashboard-preferences.controller';
import { DashboardPreferencesRepository } from './dashboard-preferences.repository';
import { DashboardPreferencesService } from './dashboard-preferences.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DashboardPreferencesController],
  providers: [DashboardPreferencesService, DashboardPreferencesRepository],
})
export class DashboardPreferencesModule {}
