import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import {
  emptyNominationStatusValues,
  nominationStatusColumns,
  type NominationStatusColumn,
  type NominationStatusFile,
  type NominationStatusIssue,
  type NominationStatusResult,
  type NominationStatusRow,
  type NominationStatusValues,
} from './nomination-status.types';

const headerAliases: Readonly<Record<string, NominationStatusColumn>> = {
  year: 'year',
  corp_plant: 'corp_plant',
  corporation_plant: 'corp_plant',
  range: 'range',
  department: 'department',
  e_no: 'employee_no',
  employee_no: 'employee_no',
  name: 'employee_name',
  employee_name: 'employee_name',
  tp: 'talent_pool',
  talent_pool: 'talent_pool',
  result: 'result',
  admission: 'admission',
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value))
      throw new BadRequestException(
        'The workbook contains an employee number larger than Excel can safely represent. Format employee numbers as text.',
      );
    return String(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined)
      return cellToString(value.result);
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('richText' in value)
      return value.richText.map((part) => part.text).join('');
  }
  return '';
}

function normalizeResult(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  const results: Record<string, NominationStatusResult> = {
    cleared: 'Cleared',
    amber: 'Amber',
    'not cleared': 'Not Cleared',
  };
  return results[normalized] ?? value.trim();
}

export function cleanNominationStatusValues(
  input: unknown,
): NominationStatusValues {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Row values are required.');
  const record = input as Record<string, unknown>;
  const values = emptyNominationStatusValues();
  for (const column of nominationStatusColumns) {
    if (typeof record[column] !== 'string')
      throw new BadRequestException(`Provide ${column} as text.`);
    values[column] = record[column].trim();
  }
  values.result = normalizeResult(values.result);
  return values;
}

export function validateNominationStatusRow(
  values: NominationStatusValues,
): NominationStatusIssue[] {
  const issues: NominationStatusIssue[] = [];
  const add = (column: NominationStatusColumn, message: string) =>
    issues.push({ column, message, severity: 'error' });
  for (const column of nominationStatusColumns)
    if (!values[column]) add(column, 'This value is required.');
  if (values.year && !/^\d{4}$/.test(values.year))
    add('year', 'Enter a four-digit year.');
  if (
    values.employee_no &&
    (!/^[1-9]\d{0,18}$/.test(values.employee_no) ||
      BigInt(values.employee_no) > 9223372036854775807n)
  )
    add('employee_no', 'Enter a valid positive employee number.');
  if (
    values.result &&
    !(['Cleared', 'Amber', 'Not Cleared'] as string[]).includes(values.result)
  )
    add('result', 'Enter Cleared, Amber, or Not Cleared.');
  for (const column of nominationStatusColumns)
    if (values[column].length > 500)
      add(column, 'Value exceeds 500 characters.');
  return issues;
}

function mapRows(matrix: string[][]): NominationStatusRow[] {
  if (matrix.length < 2)
    throw new BadRequestException(
      'The file must contain a header and at least one data row.',
    );
  const mappedHeaders = matrix[0].map(
    (header) => headerAliases[normalizeHeader(header)],
  );
  const unknown = matrix[0].filter((_, index) => !mappedHeaders[index]);
  const duplicates = mappedHeaders.filter(
    (header, index) => header && mappedHeaders.indexOf(header) !== index,
  );
  const missing = nominationStatusColumns.filter(
    (column) => !mappedHeaders.includes(column),
  );
  if (
    unknown.length ||
    duplicates.length ||
    missing.length ||
    mappedHeaders.length !== nominationStatusColumns.length
  ) {
    const details = [
      missing.length ? `Missing: ${missing.join(', ')}.` : '',
      unknown.length ? `Unknown: ${unknown.join(', ')}.` : '',
      duplicates.length
        ? `Duplicates: ${[...new Set(duplicates)].join(', ')}.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    throw new BadRequestException(
      `The uploaded columns do not match the nomination status schema. ${details}`,
    );
  }
  const rows = matrix
    .slice(1)
    .filter((cells) => cells.some((cell) => cell.trim() !== ''))
    .map((cells, index) => {
      const raw = emptyNominationStatusValues();
      mappedHeaders.forEach((column, cellIndex) => {
        raw[column] = (cells[cellIndex] ?? '').trim();
      });
      const values = cleanNominationStatusValues(raw);
      return {
        rowNumber: index + 2,
        values,
        issues: validateNominationStatusRow(values),
      };
    });
  if (!rows.length)
    throw new BadRequestException('The file does not contain any data rows.');
  if (rows.length > 25_000)
    throw new PayloadTooLargeException(
      'The file exceeds the 25,000 row limit.',
    );
  return rows;
}

export async function parseNominationStatusFile(
  file: NominationStatusFile,
): Promise<NominationStatusRow[]> {
  const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extension === '.csv') {
    const matrix = parse(file.buffer, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
    }) as string[][];
    return mapRows(matrix.map((row) => row.map(String)));
  }
  if (extension !== '.xlsx')
    throw new BadRequestException('Only CSV and XLSX files are supported.');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer as never);
  } catch {
    throw new BadRequestException('The XLSX workbook could not be read.');
  }
  const populatedSheets = workbook.worksheets.filter(
    (sheet) => sheet.actualRowCount > 0,
  );
  if (populatedSheets.length !== 1)
    throw new BadRequestException(
      'The workbook must contain exactly one non-empty worksheet.',
    );
  const matrix: string[][] = [];
  populatedSheets[0].eachRow({ includeEmpty: true }, (row) => {
    matrix.push(
      Array.from({ length: row.cellCount }, (_, index) =>
        cellToString(row.getCell(index + 1).value),
      ),
    );
  });
  return mapRows(matrix);
}