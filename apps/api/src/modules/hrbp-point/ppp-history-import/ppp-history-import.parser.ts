import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import {
  pppContextColumns,
  pppImportColumns,
  type ParsedPppImport,
  type ParsedPppImportRow,
  type PppImportColumn,
  type PppImportIssue,
  type PppImportRowValues,
  type UploadedPppFile,
} from './ppp-history-import.types';

const contextHeaderAliases: Readonly<Record<string, PppImportColumn>> = {
  pers_no: 'pers_no',
  personnel_number: 'personnel_number',
  employee_subgroup: 'employee_subgroup',
  ps_group: 'ps_group',
  organizational_unit: 'organizational_unit',
  organisational_unit: 'organizational_unit',
  range: 'range',
  function: 'function',
};

const metricNames = ['performance', 'position', 'person', 'tcl'] as const;
type YearSlot = 'current' | 'previous' | 'oldest';

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function expectedMetricHeaders(currentYear: number): ReadonlyMap<string, PppImportColumn> {
  const headers = new Map<string, PppImportColumn>();
  const slots: readonly [number, YearSlot, boolean][] = [
    [currentYear, 'current', true],
    [currentYear - 1, 'previous', false],
    [currentYear - 2, 'oldest', false],
  ];
  for (const [year, slot, isCurrent] of slots) {
    for (const metric of metricNames) {
      headers.set(`${year}_${metric}${isCurrent ? '_current' : ''}`, `${metric}_${slot}`);
    }
  }
  return headers;
}

function formatDate(value: Date): string {
  return [value.getUTCFullYear(), String(value.getUTCMonth() + 1).padStart(2, '0'), String(value.getUTCDate()).padStart(2, '0')].join('-');
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDate(value);
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new BadRequestException('The workbook contains a number larger than Excel can safely represent. Format identifier columns as text.');
    }
    return String(value);
  }
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result !== undefined) return cellToString(value.result);
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
  }
  return '';
}

export function validatePppImportRow(values: PppImportRowValues): PppImportIssue[] {
  const issues: PppImportIssue[] = [];
  if (!values.pers_no.trim()) {
    issues.push({ column: 'pers_no', message: 'Required value is missing.', severity: 'error' });
  } else if (!/^[1-9]\d{0,18}$/.test(values.pers_no) || BigInt(values.pers_no) > 9_223_372_036_854_775_807n) {
    issues.push({ column: 'pers_no', message: 'Enter a valid positive employee number.', severity: 'error' });
  }
  return issues;
}

function mapRows(matrix: string[][], currentYear: number): ParsedPppImportRow[] {
  if (matrix.length < 2) throw new BadRequestException('The file must contain a header and at least one data row.');
  const metricHeaders = expectedMetricHeaders(currentYear);
  const normalizedHeaders = matrix[0].map(normalizeHeader);
  const mappedHeaders = normalizedHeaders.map((header) => contextHeaderAliases[header] ?? metricHeaders.get(header));
  const duplicateHeaders = normalizedHeaders.filter((header, index) => normalizedHeaders.indexOf(header) !== index);
  const unknownHeaders = normalizedHeaders.filter((_, index) => mappedHeaders[index] === undefined);
  const presentColumns = mappedHeaders.filter((column): column is PppImportColumn => column !== undefined);
  const duplicateColumns = presentColumns.filter((column, index) => presentColumns.indexOf(column) !== index);
  const missingColumns = pppImportColumns.filter((column) => !presentColumns.includes(column));

  if (normalizedHeaders.length !== pppImportColumns.length || duplicateHeaders.length || duplicateColumns.length || unknownHeaders.length || missingColumns.length) {
    const details = [
      missingColumns.length ? `Missing: ${missingColumns.join(', ')}.` : '',
      unknownHeaders.length ? `Unknown: ${[...new Set(unknownHeaders)].join(', ')}.` : '',
      duplicateHeaders.length || duplicateColumns.length
        ? `Duplicates: ${[...new Set([...duplicateHeaders, ...duplicateColumns])].join(', ')}.`
        : '',
    ].filter(Boolean).join(' ');
    throw new BadRequestException(`The uploaded columns do not match the ${currentYear}/${currentYear - 1}/${currentYear - 2} PPP history schema. ${details}`);
  }

  const headers = mappedHeaders as PppImportColumn[];
  const rows = matrix.slice(1)
    .filter((cells) => cells.some((cell) => cell.trim() !== ''))
    .map((cells, index) => {
      const values = Object.fromEntries(headers.map((header, cellIndex) => [header, (cells[cellIndex] ?? '').trim()])) as PppImportRowValues;
      return { rowNumber: index + 2, values, issues: validatePppImportRow(values) };
    });

  if (!rows.length) throw new BadRequestException('The file does not contain any employee rows.');
  if (rows.length > 25_000) throw new PayloadTooLargeException('The file exceeds the 25,000 row limit.');

  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
  rows.forEach((row) => {
    if (row.values.pers_no && (counts.get(row.values.pers_no) ?? 0) > 1) {
      row.issues.push({ column: 'pers_no', message: 'Employee number is duplicated in this file.', severity: 'error' });
    }
  });
  return rows;
}

export async function parsePppHistoryFile(file: UploadedPppFile, currentYear = new Date().getUTCFullYear()): Promise<ParsedPppImport> {
  if (!Number.isInteger(currentYear) || currentYear < 2000 || currentYear > 9999) throw new BadRequestException('The current year is invalid.');
  const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  let matrix: string[][];
  if (extension === '.csv') {
    matrix = (parse(file.buffer, { bom: true, relax_column_count: true, skip_empty_lines: true }) as unknown[][])
      .map((row) => row.map(String));
  } else {
    if (extension !== '.xlsx') throw new BadRequestException('Only CSV and XLSX files are supported.');
    const workbook = new ExcelJS.Workbook();
    type ExcelJsBuffer = Parameters<typeof workbook.xlsx.load>[0];
    await workbook.xlsx.load(file.buffer as unknown as ExcelJsBuffer);
    const populatedSheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
    if (populatedSheets.length !== 1) throw new BadRequestException('The workbook must contain exactly one non-empty worksheet.');
    matrix = [];
    populatedSheets[0].eachRow({ includeEmpty: true }, (row) => {
      matrix.push(Array.from({ length: row.cellCount }, (_, index) => cellToString(row.getCell(index + 1).value)));
    });
  }
  return { currentYear, rows: mapRows(matrix, currentYear) };
}

export function pppImportHeaderLabels(currentYear: number): Record<PppImportColumn, string> {
  const labels = Object.fromEntries(pppContextColumns.map((column) => [column, column])) as Partial<Record<PppImportColumn, string>>;
  for (const [year, slot, isCurrent] of [
    [currentYear, 'current', true],
    [currentYear - 1, 'previous', false],
    [currentYear - 2, 'oldest', false],
  ] as const) {
    for (const metric of metricNames) labels[`${metric}_${slot}`] = `${year} ${metric}${isCurrent ? ' Current' : ''}`;
  }
  return labels as Record<PppImportColumn, string>;
}