import type {
  AttritionCleanedRow,
  AttritionDetectionResult,
  AttritionRangeType,
  UniqueRbinRows,
  WithinPsType,
} from './rbin-attrition.types';
import type { ParsedRbinRow, RbinSourceValues } from './rbin-cleaning.types';

function normalized(value: string): string {
  return value.trim().toUpperCase();
}

function validPersNo(value: string): boolean {
  if (!/^[1-9]\d{0,18}$/.test(value)) return false;
  return BigInt(value) <= 9_223_372_036_854_775_807n;
}

function uniqueRawRows(rows: readonly { values: RbinSourceValues }[]): UniqueRbinRows {
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

function presentEmployeeNumbers(rows: readonly { values: RbinSourceValues }[]): ReadonlySet<string> {
  return new Set(rows.flatMap((row) => {
    const persNo = row.values.pers_no.trim();
    return validPersNo(persNo) ? [persNo] : [];
  }));
}

function cleanedByEmployee(rows: readonly AttritionCleanedRow[]): ReadonlyMap<string, AttritionCleanedRow> {
  return new Map(rows.map((row) => [row.persNo.trim(), row]));
}

const plantRanges = new Set(['BIDP', 'NAP', 'JAP', 'GANP']);

function rangeType(range: string | null): AttritionRangeType | null {
  if (!range) return null;
  return plantRanges.has(normalized(range)) ? 'plant' : 'corporate';
}

function withinPsType(oldType: AttritionRangeType, newType: AttritionRangeType): WithinPsType {
  if (oldType === 'plant') return newType === 'plant' ? 'plant_to_plant' : 'plant_to_corp';
  return newType === 'plant' ? 'corp_to_plant' : 'corp_to_corp';
}

export function detectAttrition(
  previousRows: readonly { values: RbinSourceValues }[],
  currentRows: readonly ParsedRbinRow[],
  previousCleanedRows: readonly AttritionCleanedRow[],
  currentCleanedRows: readonly AttritionCleanedRow[],
  pendingCandidatePersNos: readonly string[] = [],
): AttritionDetectionResult {
  const previous = uniqueRawRows(previousRows);
  const current = uniqueRawRows(currentRows);
  const currentPresence = presentEmployeeNumbers(currentRows);
  const previousCleaned = cleanedByEmployee(previousCleanedRows);
  const currentCleaned = cleanedByEmployee(currentCleanedRows);
  const events: AttritionDetectionResult['events'] = [];
  const departureCandidates: AttritionDetectionResult['departureCandidates'] = [];

  previous.forEach((prior, persNo) => {
    if (normalized(prior.organisational_area_pa) !== 'PS') return;
    const next = current.get(persNo);
    const oldCleaned = previousCleaned.get(persNo);
    const oldRange = oldCleaned?.range.trim() || null;
    const oldRangeType = rangeType(oldRange);

    if (!next) {
      if (currentPresence.has(persNo)) return;
      departureCandidates.push({
        persNo,
        previousOrganisationalAreaPa: prior.organisational_area_pa.trim(),
        previousOrganizationalUnit: prior.organizational_unit.trim(),
        previousRange: oldRange,
        previousRangeType: oldRangeType,
      });
      return;
    }

    if (normalized(next.organisational_area_pa) !== 'PS') {
      events.push({
        persNo,
        eventType: 'transfer',
        transferType: 'out_of_ps_within_rbin',
        withinPsType: null,
        countsAsPsAttrition: true,
        classificationStatus: 'confirmed',
        oldOrganisationalAreaPa: prior.organisational_area_pa.trim(),
        newOrganisationalAreaPa: next.organisational_area_pa.trim(),
        oldOrganizationalUnit: prior.organizational_unit.trim(),
        newOrganizationalUnit: next.organizational_unit.trim(),
        oldRange,
        newRange: null,
        oldRangeType,
        newRangeType: null,
      });
      return;
    }

    if (normalized(prior.organizational_unit) === normalized(next.organizational_unit)) return;
    const newCleaned = currentCleaned.get(persNo);
    const newRange = newCleaned?.range.trim() || null;
    const newRangeType = rangeType(newRange);
    const fullyClassified = oldRangeType !== null && newRangeType !== null;
    events.push({
      persNo,
      eventType: 'transfer',
      transferType: 'within_ps',
      withinPsType: fullyClassified ? withinPsType(oldRangeType, newRangeType) : 'unclassified',
      countsAsPsAttrition: false,
      classificationStatus: fullyClassified ? 'confirmed' : 'pending_range',
      oldOrganisationalAreaPa: prior.organisational_area_pa.trim(),
      newOrganisationalAreaPa: next.organisational_area_pa.trim(),
      oldOrganizationalUnit: prior.organizational_unit.trim(),
      newOrganizationalUnit: next.organizational_unit.trim(),
      oldRange,
      newRange,
      oldRangeType,
      newRangeType,
    });
  });

  return {
    events: events.sort((left, right) => left.persNo.localeCompare(right.persNo)),
    departureCandidates: departureCandidates.sort((left, right) => left.persNo.localeCompare(right.persNo)),
    reappearedPersNos: pendingCandidatePersNos
      .filter((persNo) => current.has(persNo.trim()))
      .map((persNo) => persNo.trim())
      .sort((left, right) => left.localeCompare(right)),
  };
}