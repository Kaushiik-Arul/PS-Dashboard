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
    const [careerJourney, pppHistory, stepOverview, idpStatus, talentPortfolio, developmentPortfolio, successionPortfolio] = await Promise.all([
      this.careerJourneyRepository.list(persNo),
      this.repository.getPppHistory(persNo),
      this.repository.getStepOverview(persNo),
      this.repository.getIdpStatus(persNo),
      this.repository.getTalentPortfolio(persNo),
      this.repository.getDevelopmentPortfolio(persNo),
      this.repository.getSuccessionPortfolio(persNo),
    ]);
    return { employee, careerJourney, pppHistory, stepOverview, idpStatus, talentPortfolio, developmentPortfolio, successionPortfolio };
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

  async updateJobDescription(persNoInput: string, body: unknown, user: AuthenticatedUser) {
    const persNo = await this.assertScopedEmployee(persNoInput, user);
    const input = this.jobDescriptionInput(body);
    return this.run(async () => {
      try {
        return await this.repository.updateJobDescription(
          persNo,
          input.jdId,
          input.effectiveDate,
          user.accountId,
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'JD_NOT_FOUND') {
          throw new NotFoundException('Job description was not found.');
        }
        throw error;
      }
    });
  }

  async updateStepAvailability(persNoInput: string, body: unknown, user: AuthenticatedUser) {
    const persNo = await this.assertScopedEmployee(persNoInput, user);
    const input = this.stepAvailabilityInput(body);
    return this.run(
      () => this.repository.updateStepAvailability(
        persNo,
        input.available,
        input.preferences,
        input.comments,
        user.accountId,
      ),
      'Unable to update STEP availability.',
    );
  }

  async updateIdpStatus(persNoInput: string, body: unknown, user: AuthenticatedUser) {
    const persNo = await this.assertScopedEmployee(persNoInput, user);
    const input = this.idpStatusInput(body);
    return this.run(
      () => this.repository.updateIdpStatus(
        persNo,
        input.available,
        input.comments,
        user.accountId,
      ),
      'Unable to update IDP status.',
    );
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

  private jobDescriptionInput(body: unknown): { jdId: string; effectiveDate: string } {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('JD ID and effective date are required.');
    }
    const record = body as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== 2 || keys.some((key) => key !== 'jdId' && key !== 'effectiveDate')) {
      throw new BadRequestException('Job description update must contain JD ID and effective date.');
    }
    if (typeof record.jdId !== 'string' || !record.jdId.trim() || record.jdId.trim().length > 100) {
      throw new BadRequestException('JD ID is invalid.');
    }
    if (typeof record.effectiveDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.effectiveDate)) {
      throw new BadRequestException('Effective date must be in YYYY-MM-DD format.');
    }
    const date = new Date(`${record.effectiveDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== record.effectiveDate) {
      throw new BadRequestException('Effective date is invalid.');
    }
    return { jdId: record.jdId.trim().toUpperCase(), effectiveDate: record.effectiveDate };
  }

  private stepAvailabilityInput(body: unknown): { available: boolean; preferences: string | null; comments: string | null } {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('STEP availability values are required.');
    }
    const record = body as Record<string, unknown>;
    const keys = ['available', 'preferences', 'comments'];
    if (Object.keys(record).length !== keys.length || Object.keys(record).some((key) => !keys.includes(key))) {
      throw new BadRequestException('STEP availability must contain exactly available, preferences, and comments.');
    }
    if (typeof record.available !== 'boolean') {
      throw new BadRequestException('Availability must be Yes or No.');
    }
    const text = (key: 'preferences' | 'comments'): string | null => {
      const value = record[key];
      if (value === null || value === '') return null;
      if (typeof value !== 'string' || value.trim().length > 4000) {
        throw new BadRequestException(`${key} is invalid.`);
      }
      return value.trim() || null;
    };
    return {
      available: record.available,
      preferences: record.available ? text('preferences') : null,
      comments: record.available ? text('comments') : null,
    };
  }

  private idpStatusInput(body: unknown): { available: boolean; comments: string | null } {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('IDP status values are required.');
    }
    const record = body as Record<string, unknown>;
    const keys = ['available', 'comments'];
    if (Object.keys(record).length !== keys.length || Object.keys(record).some((key) => !keys.includes(key))) {
      throw new BadRequestException('IDP status must contain exactly available and comments.');
    }
    if (typeof record.available !== 'boolean') {
      throw new BadRequestException('IDP availability must be Yes or No.');
    }
    if (!record.available) return { available: false, comments: null };
    if (record.comments === null || record.comments === '') {
      return { available: true, comments: null };
    }
    if (typeof record.comments !== 'string' || record.comments.trim().length > 4000) {
      throw new BadRequestException('comments is invalid.');
    }
    return { available: true, comments: record.comments.trim() || null };
  }

  private persNo(value: string): string {
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9_223_372_036_854_775_807n) throw new BadRequestException('Pers.No is invalid.');
    return value;
  }

  private uuid(value: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new BadRequestException('Career Journey event ID is invalid.');
    return value;
  }

  private async run<Result>(operation: () => Promise<Result>, failureMessage = 'Unable to update Career Journey.'): Promise<Result> {
    try { return await operation(); } catch (error) {
      if (error instanceof HttpException) throw error;
      if ((error as { code?: string })?.code === '23505') throw new ConflictException('A Career Journey event already exists for this employee and month.');
      this.logger.error(failureMessage);
      throw new InternalServerErrorException(failureMessage);
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
    const values = (item: unknown, label: string) => {
      if (item === undefined || item === '') return [];
      const items = Array.isArray(item) ? item : [item];
      if (items.some((entry) => typeof entry !== 'string' || entry.length > 200)) {
        throw new BadRequestException(`${label} is invalid`);
      }
      return [...new Set(items.map((entry) => (entry as string).trim()).filter(Boolean))];
    };
    return {
      search: value(input.search, 'Search', 100),
      functionName: values(input.functionName, 'Function filter'),
      orgUnit: values(input.orgUnit, 'Organizational unit filter'),
      range: values(input.range, 'Range filter'),
      location: values(input.location, 'Location filter'),
      gender: values(input.gender, 'Gender filter'),
      directOrIndirect: values(input.directOrIndirect, 'Direct or indirect filter'),
    };
  }
}