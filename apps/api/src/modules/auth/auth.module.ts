import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from '../../common/authorization/permission.guard';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}