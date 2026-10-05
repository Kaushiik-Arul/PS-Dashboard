import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  emptySuccessionPlanningValues,
  successionPlanningColumns,
  type SuccessionJdLookup,
  type SuccessionPlanningColumn,
  type SuccessionPlanningFile,
  type SuccessionPlanningIssue,
  type SuccessionPlanningRow,
  type SuccessionPlanningValues,
} from './succession-planning-import.types';

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const aliases: Record<string, SuccessionPlanningColumn> = {
  entity: 'entity',
  'updated by': 'updated_by_name',
  'rp fc mg': 'area',
  area: 'area',
  jdid: 'position_jd_id',
  'jd id': 'position_jd_id',
  'jd name': 'jd_name',
  'ipe level': 'ipe_level',
  'e sub grp': 'employee_subgroup',
  'employee subgroup': 'employee_subgroup',
  'critical niche general': 'criticality',
  criticality: 'criticality',
  'high medium low': 'priority',
  priority: 'priority',
  'e no': 'incumbent_pers_no',
  'employee number': 'incumbent_pers_no',
  name: 'incumbent_name',
  'incumbent name': 'incumbent_name',
  'org unit': 'incumbent_org_unit',
  range: 'incumbent_range',
  'in current position since years': 'incumbent_tenure_years',
  age: 'incumbent_age',
  'incumbent change expected year': 'incumbent_change_year',
  '9 box rating 2024 2025 2026': 'incumbent_9_box_rating',
  'reason for change': 'reason_for_change',
  'employee number 1': 'successor1_pers_no',
  'successor 1': 'successor1_name',
  'current dept code 1': 'successor1_dept_code',
  'current jdid 1': 'successor1_current_jd_id',
  'readiness 1': 'successor1_readiness',
  '9 box rating 1': 'successor1_9_box_rating',
  'idp in hr global development dialog form 1': 'successor1_idp_status',
  'employee number 2': 'successor2_pers_no',
  'successor 2': 'successor2_name',
  'current dept code 2': 'successor2_dept_code',
  'current jdid 2': 'successor2_current_jd_id',
  'readiness 2': 'successor2_readiness',
  '9 box rating 2': 'successor2_9_box_rating',
  'idp in hr global development dialog form 2': 'successor2_idp_status',
};

const ignoredHeaders = new Set(['sl no', 'slno', 'serial no']);

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value && value.result != null) return cellText(value.result);
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

export function cleanSuccessionPlanningValues(
  input: unknown,
): SuccessionPlanningValues {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Row values are required.');
  const record = input as Record<string, unknown>;
  const values = emptySuccessionPlanningValues();
  for (const column of successionPlanningColumns) {
    if (typeof record[column] !== 'string')
      throw new BadRequestException(`Provide ${column} as text.`);
    values[column] = record[column].trim();
  }
  return values;
}

export function validateSuccessionPlanningRows(
  rows: SuccessionPlanningRow[],
  jdLookup: SuccessionJdLookup,
): SuccessionPlanningRow[] {
  const normalized = rows.map((row) => {
    const values = { ...row.values };
    const canonicalJd = (column: SuccessionPlanningColumn) => {
      const value = values[column];
      if (value.length < 3) return;
      const suffix = value.slice(-3).toLocaleLowerCase('en-US');
      const match = jdLookup.matches.get(suffix);
      if (match && !jdLookup.ambiguousSuffixes.has(suffix)) values[column] = match;
    };

    canonicalJd('position_jd_id');
    canonicalJd('successor1_current_jd_id');
    canonicalJd('successor2_current_jd_id');

    return {
      ...row,
      values,
      issues: [] as SuccessionPlanningIssue[],
    };
  });

  const occurrenceCounts = new Map<string, number>();
  for (const row of normalized) {
    for (const column of ['successor1_pers_no', 'successor2_pers_no'] as const) {
      for (const employeeNumber of row.values[column].match(/\d+/g) ?? [])
        occurrenceCounts.set(employeeNumber, (occurrenceCounts.get(employeeNumber) ?? 0) + 1);
    }
  }

  return normalized.map((row) => {
    for (const column of ['successor1_pers_no', 'successor2_pers_no'] as const) {
      for (const employeeNumber of row.values[column].match(/\d+/g) ?? []) {
        const count = occurrenceCounts.get(employeeNumber) ?? 0;
        if (count > 2)
          row.issues.push({
            column,
            employeeNumber,
            message: `Employee appears ${count} times as a successor; maximum recommended is 2.`,
            severity: 'warning',
            occurrences: count,
          });
      }
    }
    return row;
  });
}

function headerMapping(sheet: ExcelJS.Worksheet) {
  const maximumHeaderRow = Math.min(sheet.rowCount, 20);
  for (let rowNumber = 1; rowNumber <= maximumHeaderRow; rowNumber++) {
    const mapping = new Map<number, SuccessionPlanningColumn>();
    const unknown: string[] = [];
    sheet.getRow(rowNumber).eachCell((cell, columnNumber) => {
      const text = cellText(cell.value);
      if (!text) return;
      const normalized = normalizeHeader(text);
      if (ignoredHeaders.has(normalized)) return;
      const column = aliases[normalized];
      if (!column) unknown.push(text);
      else if ([...mapping.values()].includes(column))
        throw new BadRequestException(`Repeated column: ${text}.`);
      else mapping.set(columnNumber, column);
    });
    const mapped = new Set(mapping.values());
    if (
      mapped.has('position_jd_id') &&
      mapped.has('incumbent_pers_no') &&
      mapped.has('successor1_pers_no')
    ) {
      if (unknown.length)
        throw new BadRequestException(
          `Unexpected columns: ${unknown.join(', ')}.`,
        );
      const missing = successionPlanningColumns.filter(
        (column) => !mapped.has(column),
      );
      if (missing.length)
        throw new BadRequestException(`Missing columns: ${missing.join(', ')}.`);
      return { rowNumber, mapping };
    }
  }
  throw new BadRequestException(
    'Could not find the Succession Planning column header row.',
  );
}

export async function parseSuccessionPlanningFile(
  file: SuccessionPlanningFile,
): Promise<SuccessionPlanningRow[]> {
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
  if (sheet.rowCount > 25020)
    throw new PayloadTooLargeException(
      'The worksheet exceeds 25,000 data rows.',
    );

  const header = headerMapping(sheet);
  const rows: SuccessionPlanningRow[] = [];
  for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const values = emptySuccessionPlanningValues();
    for (const [columnNumber, column] of header.mapping) {
      const raw = sheet.getRow(rowNumber).getCell(columnNumber).value;
      if (
        (column.endsWith('_pers_no') || column === 'incumbent_pers_no') &&
        typeof raw === 'number' &&
        !Number.isSafeInteger(raw)
      )
        throw new BadRequestException(
          `Excel row ${rowNumber}: format employee numbers as text to preserve them.`,
        );
      values[column] = cellText(raw);
    }
    if (successionPlanningColumns.every((column) => !values[column])) continue;
    rows.push({
      rowNumber,
      values: cleanSuccessionPlanningValues(values),
      issues: [],
    });
  }
  if (!rows.length)
    throw new BadRequestException('The workbook has no data rows.');
  return rows;
}
