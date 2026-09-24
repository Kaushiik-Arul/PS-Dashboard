import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { rbinExceptionColumns, type RbinExceptionColumn } from '../namelist-import/namelist-import.types';
import { RbinExceptionsRepository } from './rbin-exceptions.repository';
import { rbinExceptionColumnLabels, type RbinException, type RbinExceptionInput, type RbinExceptionPage, type RbinExceptionRuleInput } from './rbin-exceptions.types';

const maximumBigInt = BigInt('9223372036854775807');
const dateColumns = new Set<RbinExceptionColumn>(['birth_date', 'joining_date', 'entry_for_retirement', 'technical_entry_date']);
const integerColumns = new Set<RbinExceptionColumn>(['global_id', 'hrbp_global_id']);

@Injectable()
export class RbinExceptionsService {
  private readonly logger = new Logger(RbinExceptionsService.name);
  constructor(private readonly repository: RbinExceptionsRepository) {}

  async list(searchInput?: string, filterInput?: string, pageInput?: string, pageSizeInput?: string): Promise<RbinExceptionPage> {
    const search = searchInput?.trim() ?? '';
    if (search.length > 100) throw new BadRequestException('Search must not exceed 100 characters.');
    const filter = filterInput?.trim() ?? '';
    if (filter && !rbinExceptionColumns.includes(filter as RbinExceptionColumn)) throw new BadRequestException('Exception column filter is invalid.');
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 8, 100);
    const result = await this.run(() => this.repository.list(search, filter, page, pageSize), 'Unable to load employee exceptions');
    return { ...result, columns: rbinExceptionColumns.map((key) => ({ key, label: rbinExceptionColumnLabels[key] })) };
  }

  async create(body: unknown, actorAccountId: string): Promise<RbinException[]> {
    const record = this.record(body, ['persNo', 'rules']);
    const persNo = this.persNo(record.persNo);
    if (!Array.isArray(record.rules) || record.rules.length === 0 || record.rules.length > rbinExceptionColumns.length) {
      throw new BadRequestException('Add between 1 and 27 exception rules.');
    }
    const rules = record.rules.map((rule) => this.rule(rule));
    if (new Set(rules.map((rule) => rule.columnName)).size !== rules.length) {
      throw new BadRequestException('Each column may be selected only once per employee.');
    }
    return this.run(() => this.repository.createMany(persNo, rules, actorAccountId), 'Unable to create employee exceptions');
  }

  async update(idInput: string, body: unknown, actorAccountId: string): Promise<RbinException> {
    const id = this.uuid(idInput);
    const record = this.record(body, ['persNo', 'columnName', 'fixedValue']);
    const input: RbinExceptionInput = {
      persNo: this.persNo(record.persNo),
      ...this.rule({ columnName: record.columnName, fixedValue: record.fixedValue }),
    };
    return this.run(async () => {
      const updated = await this.repository.update(id, input, actorAccountId);
      if (!updated) throw new NotFoundException('Employee exception was not found.');
      return updated;
    }, 'Unable to update employee exception');
  }

  async delete(idInput: string, actorAccountId: string): Promise<void> {
    const id = this.uuid(idInput);
    await this.run(async () => {
      if (!(await this.repository.delete(id, actorAccountId))) throw new NotFoundException('Employee exception was not found.');
    }, 'Unable to delete employee exception');
  }

  private rule(value: unknown): RbinExceptionRuleInput {
    const record = this.record(value, ['columnName', 'fixedValue']);
    if (typeof record.columnName !== 'string' || !rbinExceptionColumns.includes(record.columnName as RbinExceptionColumn)) {
      throw new BadRequestException('Select a valid non-identity Namelist column.');
    }
    if (typeof record.fixedValue !== 'string') throw new BadRequestException('Fixed value must be text.');
    const fixedValue = record.fixedValue.trim();
    if (!fixedValue || fixedValue.length > 500) throw new BadRequestException('Fixed value must contain 1 to 500 characters.');
    const columnName = record.columnName as RbinExceptionColumn;
    if (integerColumns.has(columnName) && !this.validBigInt(fixedValue)) throw new BadRequestException(`${rbinExceptionColumnLabels[columnName]} must be a positive whole number within the BIGINT range.`);
    if (dateColumns.has(columnName) && !this.validDate(fixedValue)) throw new BadRequestException(`${rbinExceptionColumnLabels[columnName]} must be a valid date in YYYY-MM-DD format.`);
    if (columnName === 'official_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fixedValue)) throw new BadRequestException('Official Email must be valid.');
    return { columnName, fixedValue };
  }

  private record(value: unknown, keys: string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Exception values are required.');
    const record = value as Record<string, unknown>;
    const actual = Object.keys(record);
    if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) throw new BadRequestException(`Exception must contain exactly ${keys.join(', ')}.`);
    return record;
  }

  private persNo(value: unknown): string {
    if (typeof value !== 'string' || !this.validBigInt(value.trim())) throw new BadRequestException('Pers.No must be a positive whole number within the BIGINT range.');
    return value.trim();
  }

  private validBigInt(value: string): boolean { return value.length <= 19 && /^[1-9]\d*$/.test(value) && BigInt(value) <= maximumBigInt; }
  private validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  private uuid(value: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new BadRequestException('Exception ID is invalid.');
    return value;
  }
  private positiveInteger(value: string | undefined, fallback: number, maximum: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new BadRequestException('Pagination values must be positive whole numbers.');
    const parsed = Number(value);
    if (parsed < 1 || parsed > maximum) throw new BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
    return parsed;
  }
  private async run<Result>(operation: () => Promise<Result>, message: string): Promise<Result> {
    try { return await operation(); } catch (error) {
      if (error instanceof HttpException) throw error;
      if ((error as { code?: string })?.code === '23505') throw new ConflictException('This employee already has an exception for one of the selected columns.');
      this.logger.error(message);
      throw new InternalServerErrorException(message);
    }
  }
}