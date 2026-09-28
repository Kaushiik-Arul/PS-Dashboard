import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { parseEmployeeJdFile, validateEmployeeJdRow } from './employee-jd-import.parser';
import { EmployeeJdImportRepository } from './employee-jd-import.repository';
import {
  employeeJdColumns,
  type EmployeeJdPreviewFilter,
  type EmployeeJdPreviewPage,
  type EmployeeJdPreviewSummary,
  type EmployeeJdRowValues,
  type ParsedEmployeeJdRow,
  type UploadedEmployeeJdFile,
} from './employee-jd-import.types';

@Injectable()
export class EmployeeJdImportService {
  private readonly logger = new Logger(EmployeeJdImportService.name);

  constructor(private readonly repository: EmployeeJdImportRepository) {}

  async createPreview(file: UploadedEmployeeJdFile | undefined, actorAccountId: string): Promise<EmployeeJdPreviewSummary> {
    if (!file) throw new BadRequestException('An XLSX file is required.');
    let parsedRows: ParsedEmployeeJdRow[];
    try {
      parsedRows = await parseEmployeeJdFile(file);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException('The uploaded workbook could not be parsed.');
    }
    return this.run(async () => {
      const rows = await this.revalidateRows(parsedRows);
      const previewId = await this.repository.createPreview(actorAccountId, file, rows);
      const preview = await this.repository.getSummary(previewId, actorAccountId);
      if (!preview) throw new Error('PREVIEW_NOT_FOUND');
      return preview;
    }, 'Unable to create employee JD preview');
  }

  async getRows(previewId: string, actorAccountId: string, filterInput?: string, pageInput?: string, pageSizeInput?: string): Promise<EmployeeJdPreviewPage> {
    const filter: EmployeeJdPreviewFilter = filterInput === 'valid' || filterInput === 'invalid' ? filterInput : 'all';
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
    return this.run(async () => {
      const preview = await this.repository.getRows(previewId, actorAccountId, filter, page, pageSize);
      if (!preview) throw new NotFoundException('Employee JD preview was not found or has expired.');
      return preview;
    }, 'Unable to load employee JD preview');
  }

  async updateRow(previewId: string, rowNumberInput: string, input: unknown, actorAccountId: string): Promise<EmployeeJdPreviewSummary> {
    const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
    const values = this.validateRowInput(input);
    return this.run(async () => {
      const rows = await this.repository.getAllRows(previewId, actorAccountId);
      if (!rows) throw new NotFoundException('Employee JD preview was not found or has expired.');
      const target = rows.find((row) => row.rowNumber === rowNumber);
      if (!target) throw new NotFoundException('Preview row was not found.');
      target.values = values;
      await this.repository.replaceRows(previewId, actorAccountId, await this.revalidateRows(rows));
      const summary = await this.repository.getSummary(previewId, actorAccountId);
      if (!summary) throw new NotFoundException('Employee JD preview was not found or has expired.');
      return summary;
    }, 'Unable to update employee JD preview row');
  }

  async deleteRow(previewId: string, rowNumberInput: string, actorAccountId: string): Promise<void> {
    const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
    await this.run(async () => {
      if (!(await this.repository.deleteRow(previewId, actorAccountId, rowNumber))) {
        throw new NotFoundException('Preview row was not found.');
      }
    }, 'Unable to delete employee JD preview row');
  }

  async cancel(previewId: string, actorAccountId: string): Promise<void> {
    await this.run(async () => {
      if (!(await this.repository.cancel(previewId, actorAccountId))) {
        throw new NotFoundException('Employee JD preview was not found or has expired.');
      }
    }, 'Unable to cancel employee JD preview');
  }

  commit(previewId: string, confirmReplacement: unknown, actorAccountId: string) {
    if (typeof confirmReplacement !== 'boolean') {
      throw new BadRequestException('Replacement confirmation must be a boolean.');
    }
    return this.run(
      () => this.repository.commit(previewId, actorAccountId, confirmReplacement),
      'Unable to import employee JD assignments',
    );
  }

  private async revalidateRows(rows: ParsedEmployeeJdRow[]): Promise<ParsedEmployeeJdRow[]> {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
    const validPersNos = rows.map((row) => row.values.pers_no)
      .filter((value) => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9_223_372_036_854_775_807n);
    const candidateJdIds = rows.map((row) => row.values.jd_id.trim()).filter(Boolean);
    const [knownPersNos, knownJdIds] = await Promise.all([
      this.repository.getKnownPersNos([...new Set(validPersNos)]),
      this.repository.getKnownJdIds([...new Set(candidateJdIds.map((value) => value.slice(-3).toLowerCase()))]),
    ]);
    return rows.map((row) => {
      const values = {
        pers_no: row.values.pers_no.trim(),
        jd_id: row.values.jd_id.trim().toUpperCase(),
      };
      const issues = validateEmployeeJdRow(values);
      if (values.pers_no && (counts.get(values.pers_no) ?? 0) > 1) {
        issues.push({ column: 'pers_no', message: 'Employee number is duplicated in this workbook.' });
      } else if (!issues.some((issue) => issue.column === 'pers_no') && !knownPersNos.has(values.pers_no)) {
        issues.push({ column: 'pers_no', message: 'Employee is not in the current namelist.' });
      }
      const canonicalJdId = knownJdIds.get(values.jd_id.slice(-3).toLowerCase());
      if (!issues.some((issue) => issue.column === 'jd_id') && !canonicalJdId) {
        issues.push({ column: 'jd_id', message: 'JD ID suffix does not uniquely match the JD master.' });
      } else if (canonicalJdId) {
        values.jd_id = canonicalJdId;
      }
      return { ...row, values, issues };
    });
  }

  private validateRowInput(input: unknown): EmployeeJdRowValues {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new BadRequestException('Row values are required.');
    }
    const record = input as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== employeeJdColumns.length || keys.some((key) => !employeeJdColumns.includes(key as never))) {
      throw new BadRequestException('Row values must contain exactly Pers.No. and JD ID.');
    }
    if (typeof record.pers_no !== 'string' || typeof record.jd_id !== 'string') {
      throw new BadRequestException('Pers.No. and JD ID must be text.');
    }
    return { pers_no: record.pers_no.trim(), jd_id: record.jd_id.trim().toUpperCase() };
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

  private async run<Result>(operation: () => Promise<Result>, publicMessage: string): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error) {
        if (error.message === 'PREVIEW_NOT_FOUND') throw new NotFoundException('Employee JD preview was not found or has expired.');
        if (error.message === 'LAST_PREVIEW_ROW') throw new ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
        if (error.message === 'INVALID_ROWS') throw new ConflictException('All invalid rows must be corrected before import.');
        if (error.message === 'STALE_PREVIEW') {
          throw new ConflictException('Employee or JD master data changed after validation. Upload the workbook again.');
        }
        if (error.message === 'REPLACEMENT_CONFIRMATION_REQUIRED') {
          throw new ConflictException('Confirm replacement of all current employee JD assignments.');
        }
      }
      this.logger.error(publicMessage);
      throw new InternalServerErrorException(publicMessage);
    }
  }
}