import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { normalizeLookupKey } from '../rbin-cleaning/rbin-cleaning.transformer';
import {
  attritionColumns,
  emptyAttritionValues,
  type AttritionColumn,
  type AttritionFile,
  type AttritionIssue,
  type AttritionRow,
  type AttritionStoredValues,
  type AttritionValues,
} from './attrition-import.types';

const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n;

const normalizeHeader = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const aliases: Record<string, AttritionColumn> = {
  'pers no': 'pers_no',
  'personnel number': 'employee_name',
  'ps group': 'ps_group',
  'gender key': 'gender_key',
  filter: 'filter_value',
  'reason for action': 'reason_for_action',
  'detailed reason approved': 'detailed_reason_approved',
  'org unit': 'org_unit',
  range: 'range',
  'initiated date': 'initiated_date_raw',
  lwd: 'lwd_raw',
  'e separation request no': 'e_separation_request_no',
  'to org unit': 'to_org_unit',
};

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value && value.result != null) return cellText(value.result);
    if ('text' in value) return value.text.trim();
    if ('richText' in value)
      return value.richText.map((part) => part.text).join('').trim();
    return '';
  }
  return String(value).trim();
}

export function cleanAttritionValues(input: unknown): AttritionValues {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Row values are required.');
  const record = input as Record<string, unknown>;
  const values = emptyAttritionValues();
  for (const column of attritionColumns) {
    if (typeof record[column] !== 'string')
      throw new BadRequestException(`Provide ${column} as text.`);
    values[column] = record[column].trim();
  }
  return values;
}

export function cleanAttritionStoredValues(input: unknown): AttritionStoredValues {
  const values = cleanAttritionValues(input);
  const source = (input as Record<string, unknown>).range_source;
  return {
    ...values,
    range_source:
      source === 'uploaded' || source === 'inferred' ? source : 'missing',
  };
}

function validIsoDate(year: number, month: number, day: number): string {
  const value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : '';
}

function parseDate(value: string): { iso: string; display: string } {
  if (!value) return { iso: '', display: '' };
  let year: number;
  let month: number;
  let day: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
    if (match) {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    } else {
      match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
      if (!match) return { iso: '', display: '' };
      month = Number(match[1]);
      day = Number(match[2]);
      year = Number(match[3]);
    }
  }
  const iso = validIsoDate(year, month, day);
  return {
    iso,
    display: iso
      ? `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${String(year).padStart(4, '0')}`
      : '',
  };
}

function validPersNo(value: string): boolean {
  if (!/^[1-9]\d*$/.test(value)) return false;
  try {
    return BigInt(value) <= POSTGRES_BIGINT_MAX;
  } catch {
    return false;
  }
}

export function validateAttritionRows(
  rows: Array<{ rowNumber: number; values: AttritionStoredValues }>,
  rangeMappings: ReadonlyMap<string, string>,
): AttritionRow[] {
  const normalized = rows.map((row): AttritionRow => {
    const values = { ...row.values };
    const issues: AttritionIssue[] = [];
    if (!validPersNo(values.pers_no))
      issues.push({
        column: 'pers_no',
        code: values.pers_no ? 'invalid' : 'required',
        message: values.pers_no
          ? 'Enter a positive whole number within the BIGINT range.'
          : 'Pers.No. is required.',
        severity: 'error',
      });

    if (values.range_source === 'missing' && !values.range) {
      const mappedRange = rangeMappings.get(normalizeLookupKey(values.org_unit));
      if (mappedRange) {
        values.range = mappedRange;
        values.range_source = 'inferred';
      }
    }
    if (values.range_source === 'inferred')
      issues.push({
        column: 'range',
        code: 'range_inferred',
        message: `Range was inferred from Org Unit as ${values.range}. Keep it or enter another value.`,
        severity: 'warning',
      });
    else if (
      values.range_source === 'missing' &&
      !values.range &&
      values.org_unit
    )
      issues.push({
        column: 'range',
        code: 'range_mapping_not_found',
        message: 'No Range mapping was found for this Org Unit.',
        severity: 'warning',
      });

    const initiatedDate = parseDate(values.initiated_date_raw);
    const lwd = parseDate(values.lwd_raw);
    if (values.initiated_date_raw && !initiatedDate.iso)
      issues.push({
        column: 'initiated_date_raw',
        code: 'invalid',
        message: 'Enter Initiated date as DD.MM.YYYY.',
        severity: 'warning',
      });
    else if (initiatedDate.display)
      values.initiated_date_raw = initiatedDate.display;
    if (values.lwd_raw && !lwd.iso)
      issues.push({
        column: 'lwd_raw',
        code: 'invalid',
        message: 'Enter LWD as DD.MM.YYYY.',
        severity: 'warning',
      });
    else if (lwd.display)
      values.lwd_raw = lwd.display;
    return {
      ...row,
      values,
      initiatedDate: initiatedDate.iso,
      lwd: lwd.iso,
      issues,
    };
  });

  const counts = new Map<string, number>();
  normalized.forEach((row) => {
    if (validPersNo(row.values.pers_no))
      counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1);
  });
  normalized.forEach((row) => {
    const occurrences = counts.get(row.values.pers_no) ?? 0;
    if (occurrences > 1)
      row.issues.push({
        column: 'pers_no',
        code: 'duplicate',
        message: `Pers.No. appears ${occurrences} times in this upload.`,
        severity: 'warning',
        occurrences,
      });
  });
  return normalized;
}

function headerMapping(sheet: ExcelJS.Worksheet) {
  const maximumHeaderRow = Math.min(sheet.rowCount, 20);
  for (let rowNumber = 1; rowNumber <= maximumHeaderRow; rowNumber++) {
    const mapping = new Map<number, AttritionColumn>();
    const unknown: string[] = [];
    sheet.getRow(rowNumber).eachCell((cell, columnNumber) => {
      const text = cellText(cell.value);
      if (!text) return;
      const column = aliases[normalizeHeader(text)];
      if (!column) unknown.push(text);
      else if ([...mapping.values()].includes(column))
        throw new BadRequestException(`Repeated column: ${text}.`);
      else mapping.set(columnNumber, column);
    });
    if (!mapping.size) continue;
    const mapped = new Set(mapping.values());
    if (!mapped.has('pers_no') || !mapped.has('employee_name')) continue;
    if (unknown.length)
      throw new BadRequestException(`Unexpected columns: ${unknown.join(', ')}.`);
    const missing = attritionColumns.filter((column) => !mapped.has(column));
    if (missing.length)
      throw new BadRequestException(`Missing columns: ${missing.join(', ')}.`);
    return { rowNumber, mapping };
  }
  throw new BadRequestException('Could not find the Attrition column header row.');
}

export async function parseAttritionFile(file: AttritionFile) {
  if (!/\.xlsx$/i.test(file.originalname))
    throw new BadRequestException('Choose an XLSX workbook.');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file.buffer as never);
  } catch {
    throw new BadRequestException('The XLSX workbook could not be read.');
  }
  if (workbook.worksheets.length !== 1)
    throw new BadRequestException('The workbook must contain exactly one worksheet.');
  const sheet = workbook.worksheets[0];
  if (sheet.rowCount > 25020)
    throw new PayloadTooLargeException('The worksheet exceeds 25,000 data rows.');
  const header = headerMapping(sheet);
  const rows: Array<{ rowNumber: number; values: AttritionStoredValues }> = [];
  for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const values = emptyAttritionValues();
    for (const [columnNumber, column] of header.mapping) {
      const raw = sheet.getRow(rowNumber).getCell(columnNumber).value;
      if (column === 'pers_no' && typeof raw === 'number' && !Number.isSafeInteger(raw))
        throw new BadRequestException(
          `Excel row ${rowNumber}: format Pers.No. as text to preserve it.`,
        );
      values[column] = cellText(raw);
    }
    if (attritionColumns.every((column) => !values[column])) continue;
    const cleaned = cleanAttritionValues(values);
    rows.push({
      rowNumber,
      values: {
        ...cleaned,
        range_source: cleaned.range ? 'uploaded' : 'missing',
      },
    });
  }
  if (!rows.length) throw new BadRequestException('The workbook has no data rows.');
  return rows;
}