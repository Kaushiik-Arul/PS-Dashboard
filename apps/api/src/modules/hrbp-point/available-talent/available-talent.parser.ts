import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  availableColumns,
  emptyValues,
  type AvailableColumn,
  type AvailableFile,
  type AvailableIssue,
  type AvailableRow,
  type AvailableValues,
} from './available-talent.types';
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const aliases: Record<string, AvailableColumn> = {
  'e no': 'pers_no',
  'pers no': 'pers_no',
  'e name': 'employee_name',
  'employee name': 'employee_name',
  entity: 'entity',
  dept: 'department',
  department: 'department',
  hrbp: 'hrbp',
  preferences: 'preferences',
  preferrences: 'preferences',
  'current status': 'current_status',
  comments: 'comments',
  jdid: 'jd_id',
  'jd id': 'jd_id',
};
export function cleanValues(input: unknown): AvailableValues {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Row values are required.');
  const record = input as Record<string, unknown>;
  const values = emptyValues();
  for (const key of availableColumns) {
    if (typeof record[key] !== 'string')
      throw new BadRequestException(`Provide ${key} as text.`);
    values[key] = record[key].trim();
  }
  return values;
}
export function validateAvailableRows(
  rows: AvailableRow[],
  employees: Map<string, Partial<AvailableValues>>,
  knownJds: Set<string>,
): AvailableRow[] {
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1);
  return rows.map((row) => {
    const { values } = row;
    const issues: AvailableIssue[] = [];
    const add = (
      column: AvailableColumn,
      message: string,
      severity: 'error' | 'warning' = 'error',
    ) => issues.push({ column, message, severity });
    if (
      !/^[1-9]\d{0,18}$/.test(values.pers_no) ||
      BigInt(values.pers_no || '0') > 9223372036854775807n
    )
      add('pers_no', 'Enter a valid positive employee number.');
    if (!values.employee_name)
      add('employee_name', 'Employee name is required.');
    if (values.pers_no && (counts.get(values.pers_no) ?? 0) > 1)
      add(
        'pers_no',
        'Duplicate employee number. Edit or delete the duplicate row.',
      );
    for (const key of availableColumns) {
      const limit = key === 'preferences' || key === 'comments' ? 4000 : 500;
      if (values[key].length > limit)
        add(key, `Value exceeds ${limit} characters.`);
    }
    const employee = employees.get(values.pers_no);
    if (!employee)
      add(
        'pers_no',
        'Employee is not in the current namelist. Entered details will be retained.',
        'warning',
      );
    else
      for (const key of [
        'employee_name',
        'entity',
        'department',
        'hrbp',
      ] as const) {
        const current = employee[key] ?? '';
        if (current.trim().toLowerCase() !== values[key].trim().toLowerCase())
          add(
            key,
            `Current namelist: ${current || '(blank)'}. Entered value will be retained.`,
            'warning',
          );
      }
    if (values.jd_id && !knownJds.has(values.jd_id.toLowerCase()))
      add(
        'jd_id',
        'JDID is not in JD Master. Entered value will be retained.',
        'warning',
      );
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
export async function parseAvailableFile(
  file: AvailableFile,
): Promise<AvailableRow[]> {
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
  const mapping = new Map<number, AvailableColumn>();
  sheet.getRow(1).eachCell((cell, index) => {
    const text = cellText(cell.value);
    if (!text) return;
    const column = aliases[normalize(text)];
    if (!column) throw new BadRequestException(`Unexpected column: ${text}.`);
    if ([...mapping.values()].includes(column))
      throw new BadRequestException(`Repeated column: ${text}.`);
    mapping.set(index, column);
  });
  const missing = availableColumns.filter(
    (column) => ![...mapping.values()].includes(column),
  );
  if (missing.length)
    throw new BadRequestException(`Missing columns: ${missing.join(', ')}.`);
  const rows: AvailableRow[] = [];
  for (let number = 2; number <= sheet.rowCount; number++) {
    const values = emptyValues();
    for (const [index, column] of mapping) {
      const raw = sheet.getRow(number).getCell(index).value;
      if (
        column === 'pers_no' &&
        typeof raw === 'number' &&
        !Number.isSafeInteger(raw)
      )
        throw new BadRequestException(
          `Excel row ${number}: format E.No as text to preserve the employee number.`,
        );
      values[column] = cellText(raw);
    }
    if (availableColumns.every((column) => !values[column])) continue;
    rows.push({ rowNumber: number, values: cleanValues(values), issues: [] });
  }
  if (!rows.length)
    throw new BadRequestException('The workbook has no data rows.');
  return rows;
}
