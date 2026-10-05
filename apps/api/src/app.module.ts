import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnvironment } from './config/environment';
import { AccessPointModule } from './modules/access-point/access-point.module';
import { AuthModule } from './modules/auth/auth.module';
import { Employee360Module } from './modules/employee-360/employee-360.module';
import { HrbpPointModule } from './modules/hrbp-point/hrbp-point.module';
import { OverviewModule } from './modules/overview/overview.module';
import { SuccessionPlanningModule } from './modules/succession-planning/succession-planning.module';
import { TalentPipelineModule } from './modules/talent-pipeline/talent-pipeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    AuthModule,
    AccessPointModule,
    Employee360Module,
    HrbpPointModule,
    OverviewModule,
    SuccessionPlanningModule,
    TalentPipelineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
