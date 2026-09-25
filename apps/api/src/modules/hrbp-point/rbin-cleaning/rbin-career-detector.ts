import type { ParsedRbinRow, RbinSourceValues } from './rbin-cleaning.types';

export type DetectedCareerEvent = {
  persNo: string;
  eventType: 'entry_to_ps' | 'internal_ps_change';
  oldOrganisationalAreaPa: string;
  newOrganisationalAreaPa: string;
  oldOrganizationalUnit: string;
  newOrganizationalUnit: string;
  oldPsGroup: string;
  newPsGroup: string;
};

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function validPersNo(value: string): boolean {
  if (!/^[1-9]\d{0,18}$/.test(value)) return false;
  return BigInt(value) <= 9_223_372_036_854_775_807n;
}

function uniqueEmployees(rows: readonly { values: RbinSourceValues }[]): Map<string, RbinSourceValues> {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const persNo = row.values.pers_no.trim();
    if (validPersNo(persNo)) counts.set(persNo, (counts.get(persNo) ?? 0) + 1);
  });
  return new Map(rows.flatMap((row) => {
    const persNo = row.values.pers_no.trim();
    return validPersNo(persNo) && counts.get(persNo) === 1 ? [[persNo, row.values]] : [];
  }));
}

export function detectCareerEvents(
  previousRows: readonly { values: RbinSourceValues }[],
  currentRows: readonly ParsedRbinRow[],
): DetectedCareerEvent[] {
  const previous = uniqueEmployees(previousRows);
  const current = uniqueEmployees(currentRows);
  const events: DetectedCareerEvent[] = [];

  current.forEach((next, persNo) => {
    const prior = previous.get(persNo);
    if (!prior) return;
    const oldArea = normalized(prior.organisational_area_pa);
    const newArea = normalized(next.organisational_area_pa);
    const enteredPs = oldArea !== 'ps' && newArea === 'ps';
    const changedWithinPs = oldArea === 'ps' && newArea === 'ps' && (
      normalized(prior.organizational_unit) !== normalized(next.organizational_unit)
      || normalized(prior.ps_group) !== normalized(next.ps_group)
    );
    if (!enteredPs && !changedWithinPs) return;
    events.push({
      persNo,
      eventType: enteredPs ? 'entry_to_ps' : 'internal_ps_change',
      oldOrganisationalAreaPa: prior.organisational_area_pa.trim(),
      newOrganisationalAreaPa: next.organisational_area_pa.trim(),
      oldOrganizationalUnit: prior.organizational_unit.trim(),
      newOrganizationalUnit: next.organizational_unit.trim(),
      oldPsGroup: prior.ps_group.trim(),
      newPsGroup: next.ps_group.trim(),
    });
  });
  return events.sort((left, right) => left.persNo.localeCompare(right.persNo));
}