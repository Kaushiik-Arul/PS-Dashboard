import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import {
  namelistColumns,
  type NamelistColumn,
  type NamelistIssue,
  type NamelistRowValues,
  type ParsedNamelistRow,
  type UploadedNamelistFile,
} from './namelist-import.types';

const expectedHeaders = new Set<string>(namelistColumns);
const dateColumns = new Set<NamelistColumn>([
  'birth_date', 'joining_date', 'entry_for_retirement', 'technical_entry_date',
]);
const integerColumns = new Set<NamelistColumn>(['pers_no', 'global_id', 'hrbp_global_id']);

const headerAliases: Readonly<Record<string, NamelistColumn>> = {
  pers_no: 'pers_no',
  personnel_no: 'personnel_number',
  cost_ctr: 'cost_center',
  date_of_birth: 'birth_date',
  date_of_joinin: 'joining_date',
  date_of_joining: 'joining_date',
  global_id_of_hrbp: 'hrbp_global_id',
  global_id_of_hrbp2: 'hrbp2_global_id',
  email_official: 'official_email',
};

function normalizeHeader(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return headerAliases[normalized] ?? normalized;
}

function formatDate(value: Date): string {
  return [value.getUTCFullYear(), String(value.getUTCMonth() + 1).padStart(2, '0'), String(value.getUTCDate()).padStart(2, '0')].join('-');
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result !== undefined) return String(value.result ?? '');
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
  }
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new BadRequestException('The workbook contains an identifier larger than Excel can safely represent. Format identifier columns as text.');
  }
  return String(value);
}

function validateDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateNamelistRow(values: NamelistRowValues): NamelistIssue[] {
  const issues: NamelistIssue[] = [];
  for (const column of namelistColumns) {
    const value = values[column].trim();
    const optionalFunction = column === 'function' && values.employee_group.trim().toLowerCase() === 'outbound';
    if (!value && !optionalFunction) {
      issues.push({ column, message: 'Required value is missing.' });
      continue;
    }
    if (integerColumns.has(column) && value && !/^[1-9]\d*$/.test(value)) {
      issues.push({ column, message: 'Enter a positive whole number.' });
    }
    if (dateColumns.has(column) && value && !validateDate(value)) {
      issues.push({ column, message: 'Enter a valid date in YYYY-MM-DD format.' });
    }
  }
  const email = values.official_email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({ column: 'official_email', message: 'Enter a valid email address.' });
  }
  return issues;
}

function mapRows(matrix: string[][]): ParsedNamelistRow[] {
  if (matrix.length < 2) throw new BadRequestException('The file must contain a header and at least one data row.');
  const headers = matrix[0].map(normalizeHeader);
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  const missing = namelistColumns.filter((column) => !headers.includes(column));
  const unknown = headers.filter((header) => !expectedHeaders.has(header));
  if (duplicates.length || missing.length || unknown.length || headers.length !== namelistColumns.length) {
    const details = [
      missing.length ? `Missing: ${missing.join(', ')}.` : '',
      unknown.length ? `Unknown: ${[...new Set(unknown)].join(', ')}.` : '',
      duplicates.length ? `Duplicates: ${[...new Set(duplicates)].join(', ')}.` : '',
    ].filter(Boolean).join(' ');
    throw new BadRequestException(`The uploaded columns do not match the employee namelist schema. ${details}`);
  }

  const rows = matrix.slice(1).filter((cells) => cells.some((cell) => cell.trim() !== '')).map((cells, index) => {
    const values = Object.fromEntries(headers.map((header, cellIndex) => [header, (cells[cellIndex] ?? '').trim()])) as NamelistRowValues;
    return { rowNumber: index + 2, values, issues: validateNamelistRow(values) };
  });
  if (!rows.length) throw new BadRequestException('The file does not contain any employee rows.');
  if (rows.length > 25_000) throw new PayloadTooLargeException('The file exceeds the 25,000 row limit.');

  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
  rows.forEach((row) => {
    if (row.values.pers_no && (counts.get(row.values.pers_no) ?? 0) > 1) {
      row.issues.push({ column: 'pers_no', message: 'Employee number is duplicated in this file.' });
    }
  });
  return rows;
}

export async function parseNamelistFile(file: UploadedNamelistFile): Promise<ParsedNamelistRow[]> {
  const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extension === '.csv') {
    const matrix = parse(file.buffer, { bom: true, relax_column_count: true, skip_empty_lines: true }) as string[][];
    return mapRows(matrix.map((row) => row.map(String)));
  }
  if (extension !== '.xlsx') throw new BadRequestException('Only CSV and XLSX files are supported.');

  const workbook = new ExcelJS.Workbook();
  type ExcelJsBuffer = Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(file.buffer as unknown as ExcelJsBuffer);
  const populatedSheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
  if (populatedSheets.length !== 1) throw new BadRequestException('The workbook must contain exactly one non-empty worksheet.');
  const sheet = populatedSheets[0];
  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    matrix.push(Array.from({ length: row.cellCount }, (_, index) => cellToString(row.getCell(index + 1).value)));
  });
  return mapRows(matrix);
}