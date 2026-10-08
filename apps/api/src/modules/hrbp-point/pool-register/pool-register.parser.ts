import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  columnsFor,
  emptyValues,
  poolColumns,
  type PoolColumn,
  type PoolFile,
  type PoolIssue,
  type PoolKind,
  type PoolRow,
  type PoolValues,
} from './pool-register.types';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const aliases: Record<string, PoolColumn> = {
  'e no': 'pers_no',
  'pers no': 'pers_no',
  'employee name': 'employee_name',
  'e name': 'employee_name',
  'current grp': 'ps_group',
  'ps group': 'ps_group',
  department: 'department',
  'organizational unit': 'department',
  'department feb': 'department_feb',
  'dep feb': 'department_feb',
  range: 'range',
  'development pool': 'pool',
  'talent pool': 'pool',
  gender: 'gender',
  'pool start date': 'start_date',
  from: 'start_date',
  'pool end date': 'end_date',
  to: 'end_date',
  'active passive': 'active_passive',
};
export function poolDate(
  value: string,
  kind: PoolKind,
  column: 'start_date' | 'end_date',
): { value?: string; error?: string } {
  if (!value) return { error: 'A date is required.' };
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const local = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4})$/.exec(value);
  if (iso) {
    year = +iso[1];
    month = +iso[2];
    day = +iso[3];
  } else if (local) {
    year = +local[4];
    const us =
      kind === 'development' && column === 'end_date' && local[2] === '/';
    month = +(us ? local[1] : local[3]);
    day = +(us ? local[3] : local[1]);
  } else
    return {
      error:
        kind === 'development' && column === 'end_date'
          ? 'Use MM/DD/YYYY or YYYY-MM-DD.'
          : 'Use DD.MM.YYYY, DD/MM/YYYY or YYYY-MM-DD.',
    };
  if (year < 1900 || year > 9999)
    return { error: 'Year must be between 1900 and 9999.' };
  if (month < 1 || month > 12)
    return { error: 'Month must be between 1 and 12.' };
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > days) {
    const name = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ][month - 1];
    return {
      error: `${name} ${year} has ${days} days; day ${day} is invalid.`,
    };
  }
  return {
    value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}
export function cleanValues(input: unknown, kind: PoolKind): PoolValues {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Row values are required.');
  const record = input as Record<string, unknown>;
  const values = emptyValues();
  for (const key of columnsFor(kind)) {
    if (typeof record[key] !== 'string')
      throw new BadRequestException(`Provide ${key} as text.`);
    values[key] = record[key].trim();
  }
  for (const key of ['start_date', 'end_date'] as const)
    values[key] = poolDate(values[key], kind, key).value ?? values[key];
  return values;
}
export function validatePoolRow(
  values: PoolValues,
  kind: PoolKind,
): PoolIssue[] {
  const issues: PoolIssue[] = [];
  const add = (column: PoolColumn, message: string) =>
    issues.push({ column, message, severity: 'error' });
  if (
    !/^[1-9]\d{0,18}$/.test(values.pers_no) ||
    BigInt(values.pers_no || '0') > 9223372036854775807n
  )
    add('pers_no', 'Enter a valid positive personnel number.');
  for (const key of ['employee_name', 'pool'] as const)
    if (!values[key]) add(key, 'This value is required.');
  for (const key of ['start_date', 'end_date'] as const) {
    const parsed = poolDate(values[key], kind, key);
    if (parsed.error) add(key, parsed.error);
  }
  const start = poolDate(values.start_date, kind, 'start_date').value;
  const end = poolDate(values.end_date, kind, 'end_date').value;
  if (start && end && end < start)
    add('end_date', 'End date must be on or after start date.');
  if (kind === 'talent' && !/^(active|passive)$/i.test(values.active_passive))
    add('active_passive', 'Enter Active or Passive.');
  for (const key of poolColumns)
    if (values[key].length > 500) add(key, 'Value exceeds 500 characters.');
  return issues;
}
export function validatePoolRows(
  rows: PoolRow[],
  kind: PoolKind,
  employees: Map<string, Partial<PoolValues>>,
): PoolRow[] {
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1);
  return rows.map((row) => {
    const issues = validatePoolRow(row.values, kind);
    if (row.values.pers_no && (counts.get(row.values.pers_no) ?? 0) > 1)
      issues.push({
        column: 'pers_no',
        message:
          'Duplicate personnel number in this dataset. Edit or delete the duplicate row.',
        severity: 'error',
      });
    const employee = employees.get(row.values.pers_no);
    if (!employee)
      issues.push({
        column: 'pers_no',
        message:
          'Employee is not in the current namelist. Uploaded details will be retained.',
        severity: 'warning',
      });
    else
      for (const column of [
        'employee_name',
        'ps_group',
        'department',
        'range',
        ...(kind === 'talent' ? (['gender'] as const) : []),
      ] as const) {
        const current = employee[column] ?? '';
        if (
          current.trim().toLowerCase() !==
          row.values[column].trim().toLowerCase()
        )
          issues.push({
            column,
            message: `Current namelist: ${current || '(blank)'}. Entered value will be retained.`,
            severity: 'warning',
          });
      }
    return { ...row, issues };
  });
}
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value && value.result != null)
      return cellText(value.result);
    if ('text' in value) return value.text.trim();
    if ('richText' in value)
      return value.richText
        .map((part) => part.text)
        .join('')
        .trim();
    return '';
  }
  return String(value).trim();
}
export async function parsePoolFile(
  file: PoolFile,
  kind: PoolKind,
): Promise<PoolRow[]> {
  if (!/\.xlsx$/i.test(file.originalname))
    throw new BadRequestException('Choose an XLSX workbook.');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer as never);
  } catch {
    throw new BadRequestException('The XLSX workbook could not be read.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The workbook has no worksheets.');
  if (sheet.rowCount > 25001)
    throw new PayloadTooLargeException(
      'The worksheet exceeds 25,000 data rows.',
    );
  const expected = columnsFor(kind);
  const mapping = new Map<number, PoolColumn>();
  sheet.getRow(1).eachCell((cell, index) => {
    const text = cellText(cell.value);
    if (!text) return;
    const column = aliases[normalize(text)];
    if (!column || !expected.includes(column))
      throw new BadRequestException(`Unexpected column: ${text}.`);
    if ([...mapping.values()].includes(column))
      throw new BadRequestException(`Repeated column: ${text}.`);
    mapping.set(index, column);
  });
  const missing = expected.filter(
    (column) => ![...mapping.values()].includes(column),
  );
  if (missing.length)
    throw new BadRequestException(`Missing columns: ${missing.join(', ')}.`);
  const rows: PoolRow[] = [];
  for (let number = 2; number <= sheet.rowCount; number++) {
    const values = emptyValues();
    for (const [index, column] of mapping)
      values[column] = cellText(sheet.getRow(number).getCell(index).value);
    if (expected.every((column) => !values[column])) continue;
    const cleaned = cleanValues(values, kind);
    rows.push({
      rowNumber: number,
      values: cleaned,
      issues: validatePoolRow(cleaned, kind),
    });
  }
  if (!rows.length)
    throw new BadRequestException('The workbook has no data rows.');
  return rows;
}
