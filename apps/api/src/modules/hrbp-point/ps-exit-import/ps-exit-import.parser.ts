import { parseAttritionFile, validateAttritionRows } from '../attrition-import/attrition-import.parser';
import type { AttritionFile, AttritionStoredValues } from '../attrition-import/attrition-import.types';
import type { PsExitClassification, PsExitIssue, PsExitRow } from './ps-exit-import.types';

const reasonClassifications = new Map<string, PsExitClassification>([
  ['resignation', 'resignation'],
  ['immediate termination', 'resignation'],
  ['dismissal performance issue', 'resignation'],
  ['retirement', 'retirement'],
  ['death not related to work', 'retirement'],
  ['intra bosch transfer', 'out_of_ps_transfer'],
]);

function normalizedReason(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function classifyPsExitReason(value: string): PsExitClassification | null {
  return reasonClassifications.get(normalizedReason(value)) ?? null;
}

export async function parsePsExitFile(file: AttritionFile) {
  return parseAttritionFile(file);
}

export function validatePsExitRows(
  rows: Array<{ rowNumber: number; values: AttritionStoredValues }>,
  rangeMappings: ReadonlyMap<string, string>,
): PsExitRow[] {
  const validated = validateAttritionRows(rows, rangeMappings).map((row): PsExitRow => {
    const issues = row.issues
      .filter((issue) => issue.code !== 'duplicate')
      .map((issue): PsExitIssue => issue.column === 'lwd_raw'
        ? { ...issue, severity: 'error' }
        : issue);
    if (!row.values.lwd_raw) {
      issues.push({ column: 'lwd_raw', code: 'required', message: 'LWD is required.', severity: 'error' });
    }
    const classification = classifyPsExitReason(row.values.reason_for_action);
    if (!classification) {
      issues.push({
        column: 'reason_for_action',
        code: row.values.reason_for_action ? 'unknown_reason' : 'required',
        message: row.values.reason_for_action
          ? 'Use Resignation, Immediate termination, Dismissal - performance issue, Retirement, Death not related to work, or Intra-Bosch-Transfer.'
          : 'Reason for Action is required.',
        severity: 'error',
      });
    }
    return { ...row, issues, classification };
  });

  const occurrences = new Map<string, number>();
  for (const row of validated) {
    if (!row.values.pers_no || !row.lwd) continue;
    const key = `${row.values.pers_no}:${row.lwd.slice(0, 7)}`;
    occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  }
  for (const row of validated) {
    const count = occurrences.get(`${row.values.pers_no}:${row.lwd.slice(0, 7)}`) ?? 0;
    if (count > 1) row.issues.push({
      column: 'pers_no',
      code: 'duplicate',
      message: `This employee has ${count} exit rows in the same LWD month.`,
      severity: 'error',
      occurrences: count,
    });
  }
  return validated;
}