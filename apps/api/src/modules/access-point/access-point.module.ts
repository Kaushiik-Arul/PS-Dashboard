import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AccessPointController } from './access-point.controller';
import { AccessPointRepository } from './access-point.repository';
import { AccessPointService } from './access-point.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AccessPointController],
  providers: [AccessPointRepository, AccessPointService],
})
export class AccessPointModule {}
