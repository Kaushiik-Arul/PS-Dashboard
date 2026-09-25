import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import type {
  Employee360QueryDto,
  Employee360ResponseDto,
  NormalizedEmployee360Query,
} from './dto/employee-360.dto';
import { Employee360Repository } from './employee-360.repository';
import { CareerJourneyRepository } from './career-journey.repository';
import type { CareerJourneyEvent, CareerJourneyInput } from './career-journey.types';

@Injectable()
export class Employee360Service {
  private readonly logger = new Logger(Employee360Service.name);
  constructor(
    private readonly repository: Employee360Repository,
    private readonly careerJourneyRepository: CareerJourneyRepository,
  ) {}

  getEmployees(
    input: Employee360QueryDto,
    user: AuthenticatedUser,
  ): Promise<Employee360ResponseDto> {
    return this.repository.getEmployees(
      this.normalize(input),
      user.accountId,
      user.persNo,
    );
  }

  async getProfile(persNoInput: string, user: AuthenticatedUser) {
    const persNo = this.persNo(persNoInput);
    const result = await this.repository.getEmployees(this.normalize({ search: persNo }), user.accountId, user.persNo);
    const employee = result.employees.find((item) => item.persNo === persNo);
    if (!employee) throw new NotFoundException('Employee was not found within your workforce scope.');
    const [careerJourney, pppHistory] = await Promise.all([
      this.careerJourneyRepository.list(persNo),
      this.repository.getPppHistory(persNo),
    ]);
    return { employee, careerJourney, pppHistory };
  }

  async createCareerEvent(persNoInput: string, body: unknown, user: AuthenticatedUser): Promise<CareerJourneyEvent> {
    const persNo = await this.assertScopedEmployee(persNoInput, user);
    const input = this.careerInput(body);
    return this.run(() => this.careerJourneyRepository.create(persNo, input, user.accountId));
  }

  async updateCareerEvent(persNoInput: string, idInput: string, body: unknown, user: AuthenticatedUser): Promise<CareerJourneyEvent> {
    const persNo = await this.assertScopedEmployee(persNoInput, user);
    const id = this.uuid(idInput);
    return this.run(async () => {
      const event = await this.careerJourneyRepository.update(id, persNo, this.careerInput(body), user.accountId);
      if (!event) throw new NotFoundException('Career Journey event was not found.');
      return event;
    });
  }

  async deleteCareerEvent(persNoInput: string, idInput: string, user: AuthenticatedUser): Promise<void> {
    const persNo = await this.assertScopedEmployee(persNoInput, user);
    const id = this.uuid(idInput);
    await this.run(async () => {
      if (!(await this.careerJourneyRepository.delete(id, persNo, user.accountId))) {
        throw new NotFoundException('Career Journey event was not found.');
      }
    });
  }

  private async assertScopedEmployee(persNoInput: string, user: AuthenticatedUser): Promise<string> {
    const persNo = this.persNo(persNoInput);
    await this.getProfile(persNo, user);
    return persNo;
  }

  private careerInput(body: unknown): CareerJourneyInput {
    const keys = ['eventMonth', 'oldOrganisationalAreaPa', 'newOrganisationalAreaPa', 'oldOrganizationalUnit', 'newOrganizationalUnit', 'oldPsGroup', 'newPsGroup', 'notes'];
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Career Journey values are required.');
    const record = body as Record<string, unknown>;
    if (Object.keys(record).length !== keys.length || Object.keys(record).some((key) => !keys.includes(key))) {
      throw new BadRequestException(`Career Journey event must contain exactly ${keys.join(', ')}.`);
    }
    if (typeof record.eventMonth !== 'string' || !/^\d{4}-\d{2}-01$/.test(record.eventMonth)) {
      throw new BadRequestException('Event month must be the first day of a month in YYYY-MM-01 format.');
    }
    const date = new Date(`${record.eventMonth}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== record.eventMonth) {
      throw new BadRequestException('Event month is invalid.');
    }
    const text = (key: string, maximum: number): string | null => {
      const value = record[key];
      if (value === null || value === '') return null;
      if (typeof value !== 'string' || value.trim().length > maximum) throw new BadRequestException(`${key} is invalid.`);
      return value.trim() || null;
    };
    const input: CareerJourneyInput = {
      eventMonth: record.eventMonth,
      oldOrganisationalAreaPa: text('oldOrganisationalAreaPa', 500),
      newOrganisationalAreaPa: text('newOrganisationalAreaPa', 500),
      oldOrganizationalUnit: text('oldOrganizationalUnit', 500),
      newOrganizationalUnit: text('newOrganizationalUnit', 500),
      oldPsGroup: text('oldPsGroup', 500), newPsGroup: text('newPsGroup', 500),
      notes: text('notes', 1000),
    };
    if (!Object.entries(input).some(([key, value]) => key !== 'eventMonth' && value !== null)) {
      throw new BadRequestException('Provide at least one Career Journey value or note.');
    }
    return input;
  }

  private persNo(value: string): string {
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9_223_372_036_854_775_807n) throw new BadRequestException('Pers.No is invalid.');
    return value;
  }

  private uuid(value: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new BadRequestException('Career Journey event ID is invalid.');
    return value;
  }

  private async run<Result>(operation: () => Promise<Result>): Promise<Result> {
    try { return await operation(); } catch (error) {
      if (error instanceof HttpException) throw error;
      if ((error as { code?: string })?.code === '23505') throw new ConflictException('A Career Journey event already exists for this employee and month.');
      this.logger.error('Unable to update Career Journey');
      throw new InternalServerErrorException('Unable to update Career Journey.');
    }
  }

  private normalize(input: Employee360QueryDto): NormalizedEmployee360Query {
    const value = (item: unknown, label: string, maxLength = 200) => {
      if (item === undefined || item === '') return null;
      if (typeof item !== 'string' || item.length > maxLength) {
        throw new BadRequestException(`${label} is invalid`);
      }
      return item.trim() || null;
    };
    return {
      search: value(input.search, 'Search', 100),
      functionName: value(input.functionName, 'Function filter'),
      orgUnit: value(input.orgUnit, 'Organizational unit filter'),
      range: value(input.range, 'Range filter'),
      location: value(input.location, 'Location filter'),
      gender: value(input.gender, 'Gender filter'),
      directOrIndirect: value(input.directOrIndirect, 'Direct or indirect filter'),
    };
  }
}