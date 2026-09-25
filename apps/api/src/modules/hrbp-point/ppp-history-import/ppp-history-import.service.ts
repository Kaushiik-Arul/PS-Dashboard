import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { parsePppHistoryFile, validatePppImportRow } from './ppp-history-import.parser';
import { PppHistoryImportRepository } from './ppp-history-import.repository';
import {
  pppImportColumns,
  type ParsedPppImportRow,
  type PppImportRowValues,
  type PppPreviewFilter,
  type PppPreviewPage,
  type PppPreviewSummary,
  type UploadedPppFile,
} from './ppp-history-import.types';

@Injectable()
export class PppHistoryImportService {
  private readonly logger = new Logger(PppHistoryImportService.name);

  constructor(private readonly repository: PppHistoryImportRepository) {}

  async createPreview(file: UploadedPppFile | undefined, actorAccountId: string): Promise<PppPreviewSummary> {
    if (!file) throw new BadRequestException('A CSV or XLSX file is required.');
    let parsed;
    try {
      parsed = await parsePppHistoryFile(file);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException('The uploaded file could not be parsed.');
    }
    return this.run(async () => {
      const rows = await this.revalidateRows(parsed.rows);
      const previewId = await this.repository.createPreview(actorAccountId, file, parsed.currentYear, rows);
      const preview = await this.repository.getSummary(previewId, actorAccountId);
      if (!preview) throw new Error('PREVIEW_NOT_FOUND');
      return preview;
    }, 'Unable to create PPP history preview');
  }

  async getRows(previewId: string, actorAccountId: string, filterInput?: string, pageInput?: string, pageSizeInput?: string): Promise<PppPreviewPage> {
    const filter: PppPreviewFilter = ['valid', 'warning', 'invalid'].includes(filterInput ?? '') ? filterInput as PppPreviewFilter : 'all';
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
    return this.run(async () => {
      const preview = await this.repository.getRows(previewId, actorAccountId, filter, page, pageSize);
      if (!preview) throw new NotFoundException('PPP history preview was not found or has expired.');
      return preview;
    }, 'Unable to load PPP history preview');
  }

  async updateRow(previewId: string, rowNumberInput: string, input: unknown, actorAccountId: string): Promise<PppPreviewSummary> {
    const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
    const values = this.validateRowInput(input);
    return this.run(async () => {
      const rows = await this.repository.getAllRows(previewId, actorAccountId);
      if (!rows) throw new NotFoundException('PPP history preview was not found or has expired.');
      const target = rows.find((row) => row.rowNumber === rowNumber);
      if (!target) throw new NotFoundException('Preview row was not found.');
      target.values = values;
      await this.repository.replaceRows(previewId, actorAccountId, await this.revalidateRows(rows));
      const summary = await this.repository.getSummary(previewId, actorAccountId);
      if (!summary) throw new NotFoundException('PPP history preview was not found or has expired.');
      return summary;
    }, 'Unable to update PPP history preview row');
  }

  async cancel(previewId: string, actorAccountId: string): Promise<void> {
    await this.run(async () => {
      if (!(await this.repository.cancel(previewId, actorAccountId))) {
        throw new NotFoundException('PPP history preview was not found or has expired.');
      }
    }, 'Unable to cancel PPP history preview');
  }

  async commit(previewId: string, confirmReplacement: unknown, actorAccountId: string) {
    if (typeof confirmReplacement !== 'boolean') throw new BadRequestException('Replacement confirmation must be a boolean.');
    return this.run(
      () => this.repository.commit(previewId, actorAccountId, confirmReplacement, new Date().getUTCFullYear()),
      'Unable to import PPP history',
    );
  }

  private async revalidateRows(rows: ParsedPppImportRow[]): Promise<ParsedPppImportRow[]> {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
    const validPersNos = rows.map((row) => row.values.pers_no).filter((value) => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9_223_372_036_854_775_807n);
    const knownPersNos = await this.repository.getKnownPersNos([...new Set(validPersNos)]);
    return rows.map((row) => {
      const issues = validatePppImportRow(row.values);
      if (row.values.pers_no && (counts.get(row.values.pers_no) ?? 0) > 1) {
        issues.push({ column: 'pers_no', message: 'Employee number is duplicated in this file.', severity: 'error' });
      } else if (!issues.length && !knownPersNos.has(row.values.pers_no)) {
        issues.push({ column: 'pers_no', message: 'Employee is not in the current namelist and will be skipped.', severity: 'warning' });
      }
      return { ...row, issues };
    });
  }

  private validateRowInput(input: unknown): PppImportRowValues {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new BadRequestException('Row values are required.');
    const record = input as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== pppImportColumns.length || keys.some((key) => !pppImportColumns.includes(key as never))) {
      throw new BadRequestException('Row values must contain exactly the PPP history columns.');
    }
    const values = {} as PppImportRowValues;
    for (const column of pppImportColumns) {
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

  private async run<Result>(operation: () => Promise<Result>, publicMessage: string): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error) {
        if (error.message === 'PREVIEW_NOT_FOUND') throw new NotFoundException('PPP history preview was not found or has expired.');
        if (error.message === 'INVALID_ROWS') throw new ConflictException('All invalid rows must be corrected before import.');
        if (error.message === 'STALE_YEAR') throw new ConflictException('This preview belongs to a previous calendar year. Upload the current workbook again.');
        if (error.message === 'NO_IMPORTABLE_ROWS') throw new ConflictException('The file does not contain any employees from the current namelist.');
        if (error.message === 'REPLACEMENT_CONFIRMATION_REQUIRED') throw new ConflictException('Confirm replacement of the complete PPP history dataset.');
      }
      this.logger.error(publicMessage);
      throw new InternalServerErrorException(publicMessage);
    }
  }
}
