import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JobDescriptionsRepository } from './job-descriptions.repository';
import { parseJobDescriptionsCsv } from './job-descriptions-import.parser';
import type {
  JobDescription,
  JobDescriptionInput,
  JobDescriptionPage,
} from './job-descriptions.types';

@Injectable()
export class JobDescriptionsService {
  private readonly logger = new Logger(JobDescriptionsService.name);

  constructor(private readonly repository: JobDescriptionsRepository) {}

  list(searchInput?: string, pageInput?: string, pageSizeInput?: string): Promise<JobDescriptionPage> {
    const search = searchInput?.trim() ?? '';
    if (search.length > 200) throw new BadRequestException('Search must not exceed 200 characters.');
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 8, 100);
    return this.runDatabaseOperation(
      () => this.repository.list(search, page, pageSize),
      'Unable to load job descriptions',
    );
  }

  create(body: unknown, actorAccountId: string): Promise<JobDescription> {
    const input = this.validateInput(body);
    return this.runDatabaseOperation(
      () => this.repository.create(input, actorAccountId),
      'Unable to create job description',
    );
  }

  importCsv(file: { originalname: string; buffer: Buffer } | undefined, actorAccountId: string) {
    if (!file) throw new BadRequestException('A CSV file is required.');
    let inputs: JobDescriptionInput[];
    try {
      inputs = parseJobDescriptionsCsv(file);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException('The uploaded CSV could not be parsed.');
    }
    return this.runDatabaseOperation(
      () => this.repository.importCsv(inputs, file.originalname, actorAccountId),
      'Unable to import job descriptions',
    );
  }

  async update(idInput: string, body: unknown, actorAccountId: string): Promise<JobDescription> {
    const id = this.validateId(idInput);
    const input = this.validateInput(body);
    return this.runDatabaseOperation(async () => {
      const updated = await this.repository.update(id, input, actorAccountId);
      if (!updated) throw new NotFoundException('Job description was not found.');
      return updated;
    }, 'Unable to update job description');
  }

  async delete(idInput: string, actorAccountId: string): Promise<void> {
    const id = this.validateId(idInput);
    await this.runDatabaseOperation(async () => {
      if (!(await this.repository.delete(id, actorAccountId))) {
        throw new NotFoundException('Job description was not found.');
      }
    }, 'Unable to delete job description');
  }

  private validateId(value: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException('Job description ID is invalid.');
    }
    return value;
  }

  private validateInput(value: unknown): JobDescriptionInput {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('JD ID and Role Title are required.');
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== 2 || keys.some((key) => key !== 'jdId' && key !== 'roleTitle')) {
      throw new BadRequestException('Job description must contain JD ID and Role Title.');
    }
    if (typeof record.jdId !== 'string' || typeof record.roleTitle !== 'string') {
      throw new BadRequestException('JD ID and Role Title must be text.');
    }
    const jdId = record.jdId.trim().toUpperCase();
    const roleTitle = record.roleTitle.trim();
    if (!jdId || !roleTitle) throw new BadRequestException('JD ID and Role Title are required.');
    if (jdId.length > 100) throw new BadRequestException('JD ID must not exceed 100 characters.');
    if (roleTitle.length > 200) throw new BadRequestException('Role Title must not exceed 200 characters.');
    return { jdId, roleTitle };
  }

  private positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new BadRequestException('Pagination values must be positive whole numbers.');
    const parsed = Number(value);
    if (parsed < 1 || parsed > maximum) {
      throw new BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
    }
    return parsed;
  }

  private async runDatabaseOperation<Result>(operation: () => Promise<Result>, publicMessage: string): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const code = (error as { code?: string })?.code;
      if (code === '23505') throw new ConflictException('This JD ID already exists.');
      if (code === '23503') {
        throw new ConflictException('This job description is assigned to an employee and cannot be deleted.');
      }
      this.logger.error(publicMessage);
      throw new InternalServerErrorException(publicMessage);
    }
  }
}