import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RbinMappingsRepository } from './rbin-mappings.repository';
import {
  rbinMappingKinds,
  type RbinMapping,
  type RbinMappingInput,
  type RbinMappingKind,
  type RbinMappingPage,
} from './rbin-mappings.types';

@Injectable()
export class RbinMappingsService {
  private readonly logger = new Logger(RbinMappingsService.name);

  constructor(private readonly repository: RbinMappingsRepository) {}

  list(kindInput: string, searchInput?: string, filterInput?: string, pageInput?: string, pageSizeInput?: string): Promise<RbinMappingPage> {
    const kind = this.validateKind(kindInput);
    const search = searchInput?.trim() ?? '';
    const filter = filterInput?.trim() ?? '';
    if (search.length > 100) throw new BadRequestException('Search must not exceed 100 characters.');
    if (filter.length > 200) throw new BadRequestException('Filter must not exceed 200 characters.');
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 8, 100);
    return this.runDatabaseOperation(
      () => this.repository.list(kind, search, filter, page, pageSize),
      `Unable to load ${kind} mappings`,
    );
  }

  async create(kindInput: string, body: unknown): Promise<RbinMapping> {
    const kind = this.validateKind(kindInput);
    const input = this.validateInput(body);
    return this.runDatabaseOperation(async () => {
      const created = await this.repository.create(kind, input);
      if (!created) throw new ConflictException('This Organizational Unit already has a mapping.');
      return created;
    }, `Unable to create ${kind} mapping`);
  }

  async update(kindInput: string, idInput: string, body: unknown): Promise<RbinMapping> {
    const kind = this.validateKind(kindInput);
    const id = this.validateId(idInput);
    const input = this.validateInput(body);
    return this.runDatabaseOperation(async () => {
      const updated = await this.repository.update(kind, id, input);
      if (!updated) throw new NotFoundException('Mapping was not found.');
      return updated;
    }, `Unable to update ${kind} mapping`);
  }

  async delete(kindInput: string, idInput: string): Promise<void> {
    const kind = this.validateKind(kindInput);
    const id = this.validateId(idInput);
    await this.runDatabaseOperation(async () => {
      if (!(await this.repository.delete(kind, id))) throw new NotFoundException('Mapping was not found.');
    }, `Unable to delete ${kind} mapping`);
  }

  private validateKind(value: string): RbinMappingKind {
    if (!rbinMappingKinds.includes(value as RbinMappingKind)) {
      throw new BadRequestException('Mapping type must be ranges or functions.');
    }
    return value as RbinMappingKind;
  }

  private validateId(value: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException('Mapping ID is invalid.');
    }
    return value;
  }

  private validateInput(value: unknown): RbinMappingInput {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Mapping values are required.');
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== 2 || keys.some((key) => key !== 'organizationalUnit' && key !== 'value')) {
      throw new BadRequestException('Mapping must contain Organizational Unit and value.');
    }
    if (typeof record.organizationalUnit !== 'string' || typeof record.value !== 'string') {
      throw new BadRequestException('Mapping values must be text.');
    }
    const organizationalUnit = record.organizationalUnit.trim();
    const mappedValue = record.value.trim();
    if (!organizationalUnit || !mappedValue) throw new BadRequestException('Mapping values are required.');
    if (organizationalUnit.length > 200 || mappedValue.length > 200) {
      throw new BadRequestException('Mapping values must not exceed 200 characters.');
    }
    return { organizationalUnit, value: mappedValue };
  }

  private positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new BadRequestException('Pagination values must be positive whole numbers.');
    const parsed = Number(value);
    if (parsed < 1 || parsed > maximum) throw new BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
    return parsed;
  }

  private async runDatabaseOperation<Result>(operation: () => Promise<Result>, publicMessage: string): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('This Organizational Unit already has a mapping.');
      }
      this.logger.error(publicMessage);
      throw new InternalServerErrorException(publicMessage);
    }
  }
}