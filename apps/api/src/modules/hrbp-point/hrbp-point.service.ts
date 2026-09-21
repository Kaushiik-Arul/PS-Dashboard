import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  employeeStatusTypes,
  type CreateEmployeeStatusDto,
  type EmployeeStatusResponseDto,
  type EmployeeStatusType,
  type UpdateEmployeeStatusDto,
} from './dto/employee-status.dto';
import { HrbpPointRepository } from './hrbp-point.repository';

type ValidatedStatusValues = {
  statusType: EmployeeStatusType;
  startDate: string | null;
  endDate: string | null;
  updatedBy: string;
};

@Injectable()
export class HrbpPointService {
  private readonly logger = new Logger(HrbpPointService.name);

  constructor(private readonly repository: HrbpPointRepository) {}

  async getEmployeeStatuses(): Promise<EmployeeStatusResponseDto[]> {
    return this.runDatabaseOperation(
      () => this.repository.getEmployeeStatuses(),
      'Unable to load employee statuses',
    );
  }

  async createEmployeeStatus(
    input: CreateEmployeeStatusDto,
  ): Promise<EmployeeStatusResponseDto> {
    const persNo = this.validatePersNo(input?.persNo);
    const values = this.validateValues(input);

    return this.runDatabaseOperation(async () => {
      if (!(await this.repository.employeeExists(persNo))) {
        throw new NotFoundException('Employee number was not found');
      }

      const created = await this.repository.createEmployeeStatus(persNo, values);
      if (!created) {
        throw new ConflictException('Employee status already exists');
      }

      return created;
    }, 'Unable to create employee status');
  }

  async updateEmployeeStatus(
    persNoInput: string,
    input: UpdateEmployeeStatusDto,
  ): Promise<EmployeeStatusResponseDto> {
    const persNo = this.validatePersNo(persNoInput);
    const values = this.validateValues(input);

    return this.runDatabaseOperation(async () => {
      const updated = await this.repository.updateEmployeeStatus(persNo, values);
      if (!updated) {
        throw new NotFoundException('Employee status was not found');
      }

      return updated;
    }, 'Unable to update employee status');
  }

  async deleteEmployeeStatus(persNoInput: string): Promise<void> {
    const persNo = this.validatePersNo(persNoInput);

    await this.runDatabaseOperation(async () => {
      if (!(await this.repository.deleteEmployeeStatus(persNo))) {
        throw new NotFoundException('Employee status was not found');
      }
    }, 'Unable to delete employee status');
  }

  private validatePersNo(value: unknown): string {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException(
        'Employee number must be a positive whole number',
      );
    }

    return value;
  }

  private validateValues(input: UpdateEmployeeStatusDto): ValidatedStatusValues {
    if (!input || !employeeStatusTypes.includes(input.statusType)) {
      throw new BadRequestException('Status type is invalid');
    }

    const startDate = this.validateDate(input.startDate, 'Start date');
    const endDate = this.validateDate(input.endDate, 'End date');

    if (endDate && (!startDate || endDate < startDate)) {
      throw new BadRequestException(
        'End date must be on or after the start date',
      );
    }

    if (input.updatedBy !== 'hrbp') {
      throw new BadRequestException('Updated by must be hrbp');
    }

    return { statusType: input.statusType, startDate, endDate, updatedBy: 'hrbp' };
  }

  private validateDate(value: unknown, label: string): string | null {
    if (value === undefined || value === null || value === '') return null;

    const parsedDate =
      typeof value === 'string' ? new Date(`${value}T00:00:00Z`) : null;
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !parsedDate ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${label} is invalid`);
    }

    return value;
  }

  private async runDatabaseOperation<Result>(
    operation: () => Promise<Result>,
    publicMessage: string,
  ): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(publicMessage);
      throw new InternalServerErrorException(publicMessage);
    }
  }
}