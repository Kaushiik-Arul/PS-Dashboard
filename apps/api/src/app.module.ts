import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnvironment } from './config/environment';
import { AccessPointModule } from './modules/access-point/access-point.module';
import { AuthModule } from './modules/auth/auth.module';
import { HrbpPointModule } from './modules/hrbp-point/hrbp-point.module';
import { OverviewModule } from './modules/overview/overview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    AuthModule,
    AccessPointModule,
    HrbpPointModule,
    OverviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
