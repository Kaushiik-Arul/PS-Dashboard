import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { namelistColumns, type NamelistPreviewPage, type NamelistPreviewSummary, type NamelistRowValues, type ParsedNamelistRow, type PreviewFilter, type UploadedNamelistFile } from './namelist-import.types';
import { parseNamelistFile, validateNamelistRow } from './namelist-import.parser';
import { NamelistImportRepository } from './namelist-import.repository';

@Injectable()
export class NamelistImportService {
  private readonly logger = new Logger(NamelistImportService.name);

  constructor(private readonly repository: NamelistImportRepository) {}

  async createPreview(file: UploadedNamelistFile | undefined, actorAccountId: string): Promise<NamelistPreviewSummary> {
    if (!file) throw new BadRequestException('A CSV or XLSX file is required.');
    let rows: ParsedNamelistRow[];
    try {
      rows = await parseNamelistFile(file);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException('The uploaded file could not be parsed.');
    }
    return this.runDatabaseOperation(async () => {
      const previewId = await this.repository.createPreview(actorAccountId, file, rows);
      const preview = await this.repository.getSummary(previewId, actorAccountId);
      if (!preview) throw new Error('PREVIEW_NOT_FOUND');
      return preview;
    }, 'Unable to create namelist preview');
  }

  async getRows(previewId: string, actorAccountId: string, filterInput: string | undefined, pageInput: string | undefined, pageSizeInput: string | undefined): Promise<NamelistPreviewPage> {
    const filter: PreviewFilter = filterInput === 'valid' || filterInput === 'invalid' ? filterInput : 'all';
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
    return this.runDatabaseOperation(async () => {
      const preview = await this.repository.getRows(previewId, actorAccountId, filter, page, pageSize);
      if (!preview) throw new NotFoundException('Namelist preview was not found or has expired.');
      return preview;
    }, 'Unable to load namelist preview');
  }

  async updateRow(previewId: string, rowNumberInput: string, input: unknown, actorAccountId: string): Promise<NamelistPreviewSummary> {
    const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
    const values = this.validateRowInput(input);
    return this.runDatabaseOperation(async () => {
      const rows = await this.repository.getAllRows(previewId, actorAccountId);
      if (!rows) throw new NotFoundException('Namelist preview was not found or has expired.');
      const target = rows.find((row) => row.rowNumber === rowNumber);
      if (!target) throw new NotFoundException('Preview row was not found.');
      target.values = values;

      const counts = new Map<string, number>();
      rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
      rows.forEach((row) => {
        row.issues = validateNamelistRow(row.values);
        if (row.values.pers_no && (counts.get(row.values.pers_no) ?? 0) > 1) {
          row.issues.push({ column: 'pers_no', message: 'Employee number is duplicated in this file.' });
        }
      });
      await this.repository.replaceRows(previewId, actorAccountId, rows);
      const summary = await this.repository.getSummary(previewId, actorAccountId);
      if (!summary) throw new NotFoundException('Namelist preview was not found or has expired.');
      return summary;
    }, 'Unable to update namelist preview row');
  }

  async cancel(previewId: string, actorAccountId: string): Promise<void> {
    await this.runDatabaseOperation(async () => {
      if (!(await this.repository.cancel(previewId, actorAccountId))) {
        throw new NotFoundException('Namelist preview was not found or has expired.');
      }
    }, 'Unable to cancel namelist preview');
  }

  async commit(previewId: string, confirmReplacement: unknown, actorAccountId: string): Promise<{ totalRows: number }> {
    if (typeof confirmReplacement !== 'boolean') throw new BadRequestException('Replacement confirmation must be a boolean.');
    return this.runDatabaseOperation(async () => ({
      totalRows: await this.repository.commit(previewId, actorAccountId, confirmReplacement),
    }), 'Unable to import employee namelist');
  }

  private validateRowInput(input: unknown): NamelistRowValues {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new BadRequestException('Row values are required.');
    const record = input as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== namelistColumns.length || keys.some((key) => !namelistColumns.includes(key as never))) {
      throw new BadRequestException('Row values must contain exactly the employee namelist columns.');
    }
    const values = {} as NamelistRowValues;
    for (const column of namelistColumns) {
      if (typeof record[column] !== 'string') throw new BadRequestException(`${column} must be text.`);
      values[column] = record[column].trim();
    }
    return values;
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
      if (error instanceof Error) {
        if (error.message === 'PREVIEW_NOT_FOUND') throw new NotFoundException('Namelist preview was not found or has expired.');
        if (error.message === 'INVALID_ROWS') throw new ConflictException('All invalid rows must be corrected before import.');
        if (error.message === 'REPLACEMENT_CONFIRMATION_REQUIRED') throw new ConflictException('Confirm replacement of the completed current-month import.');
      }
      this.logger.error(publicMessage);
      throw new InternalServerErrorException(publicMessage);
    }
  }
}