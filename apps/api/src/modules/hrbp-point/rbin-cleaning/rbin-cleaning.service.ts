import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  namelistColumns,
  type NamelistRowValues,
} from '../namelist-import/namelist-import.types';
import { parseRbinFile } from './rbin-cleaning.parser';
import { RbinCleaningRepository } from './rbin-cleaning.repository';
import {
  applyDuplicateIssues,
  compareWithBaseline,
  transformRbinRows,
  validateRbinStagedValues,
} from './rbin-cleaning.transformer';
import type {
  ParsedRbinRow,
  RbinBatchSummary,
  RbinExport,
  RbinPreviewPage,
  RbinRowFilter,
  RbinStagedRow,
  UploadedRbinFile,
} from './rbin-cleaning.types';

const exportHeaders: Readonly<Record<(typeof namelistColumns)[number], string>> = {
  pers_no: 'Pers.No.',
  personnel_number: 'Personnel Number',
  employee_group: 'Employee Group',
  lp: 'LP',
  esgrp: 'ESgrp',
  employee_subgroup: 'Employee Subgroup',
  ps_group: 'PS group',
  organizational_unit: 'Organizational Unit',
  range: 'Range',
  function: 'Function',
  organisational_area_pa: 'Organisational Area(PA)',
  gender_key: 'Gender Key',
  location: 'Location',
  pa: 'PA',
  personnel_area: 'Personnel Area',
  psubarea: 'PSubarea',
  personnel_subarea: 'Personnel Subarea',
  nt_id: 'NT_ID',
  global_id: 'Global ID',
  cost_center: 'Cost Ctr',
  birth_date: 'Birth date',
  joining_date: 'Date of Joining',
  entry_for_retirement: 'Entry for Retirement',
  designation_text: 'Designation Text',
  hrbp_global_id: 'Global-Id of HRBP',
  hrbp2_global_id: 'Global-Id of HRBP2',
  official_email: 'Email Official',
  technical_entry_date: 'Technical Entry Date',
  direct_or_indirect: 'Direct or Indirect',
};

@Injectable()
export class RbinCleaningService {
  private readonly logger = new Logger(RbinCleaningService.name);

  constructor(private readonly repository: RbinCleaningRepository) {}

  async createPreview(file: UploadedRbinFile | undefined, actorAccountId: string): Promise<RbinBatchSummary> {
    if (!file) throw new BadRequestException('A CSV or XLSX file is required.');
    let rawRows: ParsedRbinRow[];
    try {
      rawRows = await parseRbinFile(file);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException('The uploaded RBIN file could not be parsed.');
    }

    return this.runDatabaseOperation(async () => {
      const mappings = await this.repository.getMappings();
      const persNos = [...new Set(rawRows
        .map((row) => row.values.pers_no.trim())
        .filter(this.isPostgresBigInt))];
      const baselines = await this.repository.getBaselines(persNos);
      const stagedRows = transformRbinRows(rawRows, mappings, baselines);
      const batchId = await this.repository.createBatch(actorAccountId, file, rawRows, stagedRows);
      const summary = await this.repository.getSummary(batchId, actorAccountId);
      if (!summary) throw new Error('BATCH_NOT_FOUND');
      return summary;
    }, 'Unable to create RBIN cleaning batch');
  }

  listBatches(actorAccountId: string): Promise<RbinBatchSummary[]> {
    return this.runDatabaseOperation(
      () => this.repository.listBatches(actorAccountId),
      'Unable to list RBIN cleaning batches',
    );
  }

  async getRows(
    batchId: string,
    actorAccountId: string,
    filterInput: string | undefined,
    pageInput: string | undefined,
    pageSizeInput: string | undefined,
    searchInput: string | undefined,
  ): Promise<RbinPreviewPage> {
    const allowedFilters: readonly RbinRowFilter[] = ['all', 'valid', 'invalid', 'new', 'changed', 'unchanged'];
    const filter = allowedFilters.includes(filterInput as RbinRowFilter)
      ? filterInput as RbinRowFilter
      : 'all';
    const page = this.positiveInteger(pageInput, 1, 1_000_000);
    const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
    const search = searchInput?.trim() ?? '';
    if (search.length > 100) throw new BadRequestException('Search must not exceed 100 characters.');
    return this.runDatabaseOperation(async () => {
      const result = await this.repository.getRows(batchId, actorAccountId, filter, page, pageSize, search);
      if (!result) throw new NotFoundException('RBIN cleaning batch was not found.');
      return result;
    }, 'Unable to load RBIN cleaning rows');
  }

  async updateRow(
    batchId: string,
    rowNumberInput: string,
    input: unknown,
    actorAccountId: string,
  ): Promise<RbinBatchSummary> {
    const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
    const values = this.validateRowInput(input);
    return this.runDatabaseOperation(async () => {
      const rows = await this.repository.getAllRows(batchId, actorAccountId);
      if (!rows) throw new NotFoundException('RBIN cleaning batch was not found.');
      const target = rows.find((row) => row.rowNumber === rowNumber);
      if (!target) throw new NotFoundException('RBIN staged row was not found.');

      const persNoChanged = target.values.pers_no !== values.pers_no;
      target.values = values;
      target.rangeSource = values.range === target.originalValues.range ? 'mapping' : 'manual';
      target.functionSource = values.function === target.originalValues.function ? 'mapping' : 'manual';
      if (!values.range) target.rangeSource = 'missing';
      if (!values.function) target.functionSource = 'missing';

      if (persNoChanged) {
        const baselines = this.isPostgresBigInt(values.pers_no)
          ? await this.repository.getBaselines([values.pers_no])
          : new Map();
        target.baselineValues = baselines.get(values.pers_no) ?? null;
      }
      rows.forEach((row) => {
        row.issues = validateRbinStagedValues(row.values);
        Object.assign(row, compareWithBaseline(row.values, row.baselineValues));
      });
      applyDuplicateIssues(rows);
      await this.repository.updateRows(batchId, actorAccountId, rows);
      const summary = await this.repository.getSummary(batchId, actorAccountId);
      if (!summary) throw new Error('BATCH_NOT_FOUND');
      return summary;
    }, 'Unable to update RBIN staged row');
  }

  async finalize(batchId: string, actorAccountId: string): Promise<RbinBatchSummary> {
    return this.runDatabaseOperation(async () => {
      await this.repository.finalize(batchId, actorAccountId);
      const summary = await this.repository.getSummary(batchId, actorAccountId);
      if (!summary) throw new Error('BATCH_NOT_FOUND');
      return summary;
    }, 'Unable to finalize RBIN cleaning batch');
  }

  async exportBatch(batchId: string, actorAccountId: string): Promise<RbinExport> {
    return this.runDatabaseOperation(async () => {
      const rows = await this.repository.getExportRows(batchId, actorAccountId);
      if (!rows) throw new Error('BATCH_NOT_EXPORTABLE');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'PS Dashboard';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('PS Namelist', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      sheet.columns = namelistColumns.map((column) => ({
        header: exportHeaders[column],
        key: column,
        width: Math.max(14, exportHeaders[column].length + 2),
      }));
      sheet.getRow(1).font = { bold: true };
      rows.forEach((row) => {
        const excelRow = sheet.addRow(row);
        ['pers_no', 'global_id', 'hrbp_global_id', 'hrbp2_global_id'].forEach((column) => {
          excelRow.getCell(namelistColumns.indexOf(column as never) + 1).numFmt = '@';
        });
      });
      sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(namelistColumns.length).letter}1` };
      const excelBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(excelBuffer);
      const fileName = `PS_Namelist_Cleaned_${new Date().toISOString().slice(0, 10)}.xlsx`;
      await this.repository.recordExport(batchId, actorAccountId, fileName, rows.length, buffer);
      return { fileName, buffer };
    }, 'Unable to export RBIN cleaning batch');
  }

  private validateRowInput(input: unknown): NamelistRowValues {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new BadRequestException('Row values are required.');
    }
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
    if (parsed < 1 || parsed > maximum) {
      throw new BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
    }
    return parsed;
  }

  private isPostgresBigInt = (value: string): boolean => {
    if (!/^[1-9]\d*$/.test(value)) return false;
    try {
      return BigInt(value) <= 9_223_372_036_854_775_807n;
    } catch {
      return false;
    }
  };

  private async runDatabaseOperation<Result>(
    operation: () => Promise<Result>,
    publicMessage: string,
  ): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error) {
        if (error.message === 'BATCH_NOT_FOUND') throw new NotFoundException('RBIN cleaning batch was not found.');
        if (error.message === 'BATCH_NOT_EDITABLE') throw new ConflictException('Only a draft RBIN batch can be edited.');
        if (error.message === 'BATCH_NOT_EXPORTABLE') throw new ConflictException('Save the cleaned dataset before export.');
        if (error.message === 'INVALID_ROWS') throw new ConflictException('Resolve every invalid row before saving the cleaned dataset.');
      }
      this.logger.error(publicMessage);
      throw new InternalServerErrorException(publicMessage);
    }
  }
}