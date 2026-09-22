import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { Employee360Controller } from './employee-360.controller';
import { Employee360Repository } from './employee-360.repository';
import { Employee360Service } from './employee-360.service';

@Module({
  imports: [DatabaseModule],
  controllers: [Employee360Controller],
  providers: [Employee360Repository, Employee360Service],
})
export class Employee360Module {}