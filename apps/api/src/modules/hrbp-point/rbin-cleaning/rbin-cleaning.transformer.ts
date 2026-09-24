import {
  namelistColumns,
  type NamelistColumn,
  type NamelistRowValues,
} from '../namelist-import/namelist-import.types';
import type {
  ParsedRbinRow,
  RbinBaselineValues,
  RbinExceptionContext,
  RbinIssue,
  RbinMappingContext,
  RbinStagedRow,
} from './rbin-cleaning.types';

const dateColumns = new Set<NamelistColumn>([
  'birth_date', 'joining_date', 'entry_for_retirement', 'technical_entry_date',
]);
const integerColumns = new Set<NamelistColumn>(['pers_no', 'global_id', 'hrbp_global_id']);

export function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function validateDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateRbinStagedValues(values: NamelistRowValues): RbinIssue[] {
  const issues: RbinIssue[] = [];
  for (const column of namelistColumns) {
    const value = values[column].trim();
    if (!value) {
      const mappingColumn = column === 'range' || column === 'function';
      issues.push({
        column,
        code: mappingColumn ? 'mapping_not_found' : 'required',
        message: mappingColumn
          ? `${column === 'range' ? 'Range' : 'Function'} mapping not found for this Organizational Unit.`
          : 'Required value is missing.',
      });
      continue;
    }
    if (integerColumns.has(column) && !isPostgresBigInt(value)) {
      issues.push({ column, code: 'invalid', message: 'Enter a positive whole number within the BIGINT range.' });
    }
    if (dateColumns.has(column) && !validateDate(value)) {
      issues.push({ column, code: 'invalid', message: 'Enter a valid date in YYYY-MM-DD format.' });
    }
  }
  const email = values.official_email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({ column: 'official_email', code: 'invalid', message: 'Enter a valid email address.' });
  }
  return issues;
}

export function compareWithBaseline(
  values: NamelistRowValues,
  baselineValues: RbinBaselineValues | null,
): Pick<RbinStagedRow, 'comparisonStatus' | 'changedColumns'> {
  if (!baselineValues) return { comparisonStatus: 'new', changedColumns: [] };
  const changedColumns = namelistColumns.filter(
    (column) => values[column].trim() !== baselineValues[column].trim(),
  );
  return {
    comparisonStatus: changedColumns.length ? 'changed' : 'unchanged',
    changedColumns,
  };
}

function toNamelistValues(
  row: ParsedRbinRow,
  mappings: RbinMappingContext,
): NamelistRowValues {
  const raw = row.values;
  const orgKey = normalizeLookupKey(raw.organizational_unit);
  return {
    pers_no: raw.pers_no,
    personnel_number: raw.personnel_number,
    employee_group: raw.employee_group,
    lp: raw.lp,
    esgrp: raw.esgrp,
    employee_subgroup: raw.employee_subgroup,
    ps_group: raw.ps_group,
    organizational_unit: raw.organizational_unit,
    range: mappings.ranges.get(orgKey) ?? '',
    function: mappings.functions.get(orgKey) ?? '',
    organisational_area_pa: raw.organisational_area_pa,
    gender_key: raw.gender_key,
    location: raw.location,
    pa: raw.pa,
    personnel_area: raw.personnel_area,
    psubarea: raw.psubarea,
    personnel_subarea: raw.personnel_subarea,
    nt_id: raw.nt_id,
    global_id: raw.global_id,
    cost_center: raw.cost_center,
    birth_date: raw.birth_date,
    joining_date: raw.joining_date,
    entry_for_retirement: raw.entry_for_retirement,
    designation_text: raw.designation_text,
    hrbp_global_id: raw.hrbp_global_id,
    hrbp2_global_id: raw.hrbp2_global_id,
    official_email: raw.official_email,
    technical_entry_date: raw.technical_entry_date,
    direct_or_indirect: raw.direct_or_indirect,
  };
}

export function transformRbinRows(
  rows: ParsedRbinRow[],
  mappings: RbinMappingContext,
  baselines: ReadonlyMap<string, RbinBaselineValues>,
  exceptions: RbinExceptionContext = new Map(),
): RbinStagedRow[] {
  const staged = rows
    .filter((row) => normalizeLookupKey(
      exceptions.get(row.values.pers_no)?.get('organisational_area_pa')
        ?? row.values.organisational_area_pa,
    ) === 'ps')
    .map((row): RbinStagedRow => {
      const values = toNamelistValues(row, mappings);
      const employeeExceptions = exceptions.get(values.pers_no);
      employeeExceptions?.forEach((fixedValue, column) => {
        values[column] = fixedValue;
      });
      const baselineValues = baselines.get(values.pers_no) ?? null;
      return {
        rowNumber: row.rowNumber,
        originalValues: { ...values },
        values,
        issues: validateRbinStagedValues(values),
        ...compareWithBaseline(values, baselineValues),
        baselineValues,
        rangeSource: employeeExceptions?.has('range') ? 'exception' : values.range ? 'mapping' : 'missing',
        functionSource: employeeExceptions?.has('function') ? 'exception' : values.function ? 'mapping' : 'missing',
      };
    });

  applyDuplicateIssues(staged);
  return staged;
}

export function applyDuplicateIssues(rows: RbinStagedRow[]): void {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const persNo = row.values.pers_no.trim();
    if (persNo) counts.set(persNo, (counts.get(persNo) ?? 0) + 1);
  });
  rows.forEach((row) => {
    row.issues = row.issues.filter((issue) => issue.code !== 'duplicate');
    const persNo = row.values.pers_no.trim();
    if (persNo && (counts.get(persNo) ?? 0) > 1) {
      row.issues.push({
        column: 'pers_no',
        code: 'duplicate',
        message: 'Employee number is duplicated in this staged dataset.',
      });
    }
  });
}

function isPostgresBigInt(value: string): boolean {
  if (!/^[1-9]\d*$/.test(value)) return false;
  try {
    return BigInt(value) <= 9_223_372_036_854_775_807n;
  } catch {
    return false;
  }
}