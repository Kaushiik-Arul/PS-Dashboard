import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnvironment } from './config/environment';
import { OverviewModule } from './modules/overview/overview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    OverviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
