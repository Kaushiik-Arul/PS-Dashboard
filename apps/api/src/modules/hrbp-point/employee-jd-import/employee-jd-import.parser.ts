import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type {
  EmployeeJdColumn,
  EmployeeJdIssue,
  EmployeeJdRowValues,
  ParsedEmployeeJdRow,
  UploadedEmployeeJdFile,
} from './employee-jd-import.types';

const headerAliases: Readonly<Record<string, EmployeeJdColumn>> = {
  pers_no: 'pers_no',
  employee_number: 'pers_no',
  jdid: 'jd_id',
  jd_id: 'jd_id',
  job_description_id: 'jd_id',
};

function normalizeHeader(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return headerAliases[normalized] ?? normalized;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new BadRequestException('The workbook contains an identifier larger than Excel can safely represent. Format identifier columns as text.');
    }
    return String(value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result !== undefined) return cellToString(value.result);
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
  }
  return '';
}

export function validateEmployeeJdRow(values: EmployeeJdRowValues): EmployeeJdIssue[] {
  const issues: EmployeeJdIssue[] = [];
  if (!values.pers_no) issues.push({ column: 'pers_no', message: 'Employee number is required.' });
  else if (!/^[1-9]\d{0,18}$/.test(values.pers_no) || BigInt(values.pers_no) > 9_223_372_036_854_775_807n) {
    issues.push({ column: 'pers_no', message: 'Enter a valid positive employee number.' });
  }
  if (!values.jd_id) issues.push({ column: 'jd_id', message: 'JD ID is required.' });
  else if (values.jd_id.length > 100) issues.push({ column: 'jd_id', message: 'JD ID must not exceed 100 characters.' });
  return issues;
}

export async function parseEmployeeJdFile(file: UploadedEmployeeJdFile): Promise<ParsedEmployeeJdRow[]> {
  if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
    throw new BadRequestException('Only XLSX files are supported.');
  }
  const workbook = new ExcelJS.Workbook();
  type ExcelJsBuffer = Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(file.buffer as unknown as ExcelJsBuffer);
  const populatedSheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
  if (populatedSheets.length !== 1) throw new BadRequestException('The workbook must contain exactly one non-empty worksheet.');

  const sheet = populatedSheets[0];
  const headerRow = sheet.getRow(1);
  const normalizedHeaders = Array.from(
    { length: headerRow.cellCount },
    (_, index) => normalizeHeader(cellToString(headerRow.getCell(index + 1).value)),
  );
  const indexes = new Map<EmployeeJdColumn, number[]>();
  normalizedHeaders.forEach((header, index) => {
    if (header === 'pers_no' || header === 'jd_id') {
      indexes.set(header, [...(indexes.get(header) ?? []), index + 1]);
    }
  });
  const missing = (['pers_no', 'jd_id'] as const).filter((column) => !indexes.has(column));
  const duplicates = [...indexes.entries()].filter(([, positions]) => positions.length > 1).map(([column]) => column);
  if (missing.length || duplicates.length) {
    const details = [
      missing.length ? `Missing: ${missing.join(', ')}.` : '',
      duplicates.length ? `Duplicates: ${duplicates.join(', ')}.` : '',
    ].filter(Boolean).join(' ');
    throw new BadRequestException(`The workbook must contain one Pers.No. column and one JDID column. ${details}`);
  }

  const rows: ParsedEmployeeJdRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values: EmployeeJdRowValues = {
      pers_no: cellToString(row.getCell(indexes.get('pers_no')![0]).value).trim(),
      jd_id: cellToString(row.getCell(indexes.get('jd_id')![0]).value).trim().toUpperCase(),
    };
    if (!values.pers_no && !values.jd_id) continue;
    rows.push({ rowNumber, values, issues: validateEmployeeJdRow(values) });
  }
  if (!rows.length) throw new BadRequestException('The workbook does not contain any employee JD rows.');
  if (rows.length > 25_000) throw new PayloadTooLargeException('The workbook exceeds the 25,000 row limit.');
  return rows;
}