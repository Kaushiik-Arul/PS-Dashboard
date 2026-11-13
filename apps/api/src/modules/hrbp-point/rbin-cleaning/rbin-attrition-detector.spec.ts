import { detectAttrition } from './rbin-attrition-detector';
import type { AttritionCleanedRow } from './rbin-attrition.types';
import { rbinSourceColumns, type RbinSourceValues } from './rbin-cleaning.types';

function values(persNo: string, overrides: Partial<RbinSourceValues> = {}): RbinSourceValues {
  return {
    ...Object.fromEntries(rbinSourceColumns.map((column) => [column, `${column}-value`])) as RbinSourceValues,
    pers_no: persNo,
    personnel_number: persNo,
    organisational_area_pa: 'PS',
    organizational_unit: 'PS/OLD',
    ...overrides,
  };
}

const raw = (persNo: string, overrides: Partial<RbinSourceValues> = {}) => ({
  rowNumber: 2,
  values: values(persNo, overrides),
});

const cleaned = (persNo: string, organizationalUnit: string, range: string): AttritionCleanedRow => ({
  persNo,
  organizationalUnit,
  range,
});

describe('RBIN attrition detection', () => {
  it('uses the first finalized month only as a baseline', () => {
    expect(detectAttrition([], [raw('1001')], [], [])).toEqual({
      events: [],
      departureCandidates: [],
      reappearedPersNos: [],
    });
  });

  it('detects an employee moving out of PS while remaining in RBIN', () => {
    const result = detectAttrition(
      [raw('1001')],
      [raw('1001', { organisational_area_pa: 'Other', organizational_unit: 'OTHER/NEW' })],
      [cleaned('1001', 'PS/OLD', 'NaP')],
      [],
    );

    expect(result.events).toEqual([expect.objectContaining({
      persNo: '1001',
      transferType: 'out_of_ps_within_rbin',
      countsAsPsAttrition: true,
      classificationStatus: 'confirmed',
    })]);
    expect(result.departureCandidates).toEqual([]);
  });

  it('creates an unresolved candidate when a previous PS employee disappears', () => {
    const result = detectAttrition(
      [raw('1001')],
      [],
      [cleaned('1001', 'PS/OLD', 'NaP')],
      [],
    );

    expect(result.events).toEqual([]);
    expect(result.departureCandidates).toEqual([expect.objectContaining({
      persNo: '1001', previousRange: 'NaP', previousRangeType: 'plant',
    })]);
  });

  it.each([
    ['NaP', 'JaP', 'plant_to_plant'],
    ['NaP', 'Corp-A', 'plant_to_corp'],
    ['Corp-A', 'Corp-B', 'corp_to_corp'],
    ['Corp-A', 'NaP', 'corp_to_plant'],
  ] as const)('classifies a %s to %s within-PS transfer as %s', (oldRange, newRange, expected) => {
    const result = detectAttrition(
      [raw('1001')],
      [raw('1001', { organizational_unit: 'PS/NEW' })],
      [cleaned('1001', 'PS/OLD', oldRange)],
      [cleaned('1001', 'PS/NEW', newRange)],
    );

    expect(result.events).toEqual([expect.objectContaining({
      transferType: 'within_ps',
      withinPsType: expected,
      countsAsPsAttrition: false,
      classificationStatus: 'confirmed',
    })]);
  });

  it('keeps a within-PS transfer unclassified when a Range is blank', () => {
    const result = detectAttrition(
      [raw('1001')],
      [raw('1001', { organizational_unit: 'PS/NEW' })],
      [cleaned('1001', 'PS/OLD', 'NaP')],
      [cleaned('1001', 'PS/NEW', '')],
    );

    expect(result.events).toEqual([expect.objectContaining({
      withinPsType: 'unclassified',
      classificationStatus: 'pending_range',
      newRangeType: null,
    })]);
  });

  it('ignores duplicate employee numbers and marks returning candidates as reappeared', () => {
    const duplicate = raw('1001');
    const result = detectAttrition(
      [raw('1001')],
      [duplicate, { ...duplicate, rowNumber: 3 }, raw('2002')],
      [],
      [],
      ['2002'],
    );

    expect(result.events).toEqual([]);
    expect(result.departureCandidates).toEqual([]);
    expect(result.reappearedPersNos).toEqual(['2002']);
  });
});