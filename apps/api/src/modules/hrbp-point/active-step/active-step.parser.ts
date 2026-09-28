import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { stepColumns, type StepColumn, type StepFile, type StepIssue, type StepRow, type StepValues } from './active-step.types';

const groupColumns: Record<string, StepColumn[]> = {
  'sl no': ['sl_no'], 'si no': ['sl_no'], year: ['year'], 'e no': ['pers_no'], 'e name': ['e_name'], group: ['grp'],
  'initiated by': ['initiated_by'], 'exchanged with': ['exchanged_with'],
  'step period': ['step_from', 'step_to'], entity: ['entity_from', 'entity_to'], gb: ['gb_from', 'gb_to'],
  function: ['function_from', 'function_to'], dept: ['dept_from', 'dept_to'], location: ['location_from', 'location_to'],
};
const normalize = (value: string) => value.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new BadRequestException('An employee number exceeds Excel precision. Format E No as text.');
    return String(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') return String(value).trim();
  if ('result' in value && value.result != null) return cellText(value.result);
  if ('text' in value) return String(value.text).trim();
  if ('richText' in value) return value.richText.map((item) => item.text).join('').trim();
  return '';
}

export function parsedDate(value: string): string | null {
  if (!value) return null;
  let year: number; let month: number; let day: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const indian = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4})$/.exec(value);
  if (iso) [, year, month, day] = iso.map(Number);
  else if (indian) { day = Number(indian[1]); month = Number(indian[3]); year = Number(indian[4]); }
  else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function validateStepRow(values: StepValues): StepIssue[] {
  const issues: StepIssue[] = [];
  if (!/^\d{4}$/.test(values.year) || +values.year < 1900) issues.push({ column: 'year', message: 'Enter a four-digit year.' });
  if (!/^[1-9]\d{0,18}$/.test(values.pers_no) || BigInt(values.pers_no || 0) > 9_223_372_036_854_775_807n) issues.push({ column: 'pers_no', message: 'Enter a valid E No.' });
  for (const column of ['step_from', 'step_to'] as const) {
    if ((column === 'step_from' || values[column]) && !parsedDate(values[column])) issues.push({ column, message: 'Enter a real date (DD.MM.YYYY, DD/MM/YYYY, or YYYY-MM-DD).' });
  }
  if (parsedDate(values.step_from) && parsedDate(values.step_to) && parsedDate(values.step_to)! < parsedDate(values.step_from)!) issues.push({ column: 'step_to', message: 'STEP To must not precede STEP From.' });
  for (const column of stepColumns) if (values[column].length > 500) issues.push({ column, message: 'Value exceeds 500 characters.' });
  return issues;
}

export async function parseStepFile(file: StepFile): Promise<StepRow[]> {
  if (!/\.xlsx$/i.test(file.originalname)) throw new BadRequestException('Choose an XLSX workbook.');
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(file.buffer as never); }
  catch { throw new BadRequestException('The XLSX workbook could not be read.'); }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The workbook has no worksheets.');
  // The template uses merged category headings followed by From/To subheadings.
  const first = sheet.getRow(1);
  const second = sheet.getRow(2);
  const mapped: StepColumn[] = [];
  let previousGroup = '';
  for (let index = 1; index <= stepColumns.length; index++) {
    const heading = normalize(cellText(first.getCell(index).value));
    const group = heading || previousGroup;
    if (heading) previousGroup = group;
    const subheading = normalize(cellText(second.getCell(index).value));
    const options = groupColumns[group];
    const mappedColumn = options?.length === 2 ? options[subheading === 'from' ? 0 : subheading === 'to' ? 1 : -1] : options?.[0];
    if (!mappedColumn) throw new BadRequestException(`Unexpected STEP header at column ${index}: ${heading || subheading || '(blank)'}.`);
    mapped.push(mappedColumn);
  }
  if (mapped.some((column, index) => column !== stepColumns[index])) {
    throw new BadRequestException('The STEP worksheet columns do not match the expected template.');
  }
  const rows: StepRow[] = [];
  for (let number = 3; number <= sheet.rowCount; number++) {
    const source = sheet.getRow(number);
    const cells = stepColumns.map((_, index) => cellText(source.getCell(index + 1).value).trim());
    if (cells.every((cell) => !cell)) continue;
    const values = Object.fromEntries(mapped.map((column, index) => [column, cells[index]])) as StepValues;
    for (const column of ['step_from', 'step_to'] as const) {
      const parsed = parsedDate(values[column]);
      if (parsed) values[column] = parsed;
    }
    rows.push({ rowNumber: number, values, issues: validateStepRow(values) });
    if (rows.length > 25_000) throw new PayloadTooLargeException('The workbook exceeds 25,000 rows.');
  }
  if (!rows.length) throw new BadRequestException('The workbook has no STEP rows.');
  return rows;
}
