import { BadRequestException } from '@nestjs/common';
import { parseRbinFile } from './rbin-cleaning.parser';
import {
  applyDuplicateIssues,
  transformRbinRows,
  validateRbinStagedValues,
} from './rbin-cleaning.transformer';
import { detectCareerEvents } from './rbin-career-detector';
import {
  rbinSourceColumns,
  type RbinSourceValues,
  type UploadedRbinFile,
} from './rbin-cleaning.types';

function rawValues(overrides: Partial<RbinSourceValues> = {}): RbinSourceValues {
  const values = Object.fromEntries(
    rbinSourceColumns.map((column) => [column, `${column}-value`]),
  ) as RbinSourceValues;
  return {
    ...values,
    pers_no: '12345',
    personnel_number: '12345',
    joining_date: '2020-02-03',
    employee_group: 'Active',
    organizational_unit: 'NaP/MFN12',
    organisational_area_pa: 'PS',
    global_id: '98765',
    birth_date: '1990-05-14',
    entry_for_retirement: '2050-05-31',
    technical_entry_date: '2020-02-03',
    official_email: 'employee@example.com',
    hrbp_global_id: '45678',
    hrbp2_global_id: 'HRBP2',
    ...overrides,
  };
}

function csvFile(content: string): UploadedRbinFile {
  return { originalname: 'rbin.csv', buffer: Buffer.from(content) };
}

function csvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

describe('RBIN cleaning', () => {
  it('maps shuffled raw columns by normalized business header', async () => {
    const values = rawValues();
    const labels: Partial<Record<(typeof rbinSourceColumns)[number], string>> = {
      pers_no: 'Pers.No.',
      personnel_number: 'Personnel Number',
      joining_date: 'Date of Joinin',
      cost_center: 'Cost Ctr',
      birth_date: 'Birth date',
      official_email: 'Email Official',
      hrbp_global_id: 'Global-Id of HRBP',
      hrbp2_global_id: 'Global-Id of HRBP2',
    };
    const columns = [...rbinSourceColumns].reverse();
    const content = [
      columns.map((column) => labels[column] ?? column).join(','),
      columns.map((column) => csvValue(values[column])).join(','),
    ].join('\n');

    const parsed = await parseRbinFile(csvFile(content));

    expect(parsed[0].values).toEqual(values);
  });

  it('maps the second duplicated RBIN HRBP header to HRBP2', async () => {
    const values = rawValues();
    const labels: Partial<Record<(typeof rbinSourceColumns)[number], string>> = {
      hrbp_global_id: 'Global-Id of HRBP',
      hrbp2_global_id: 'Global-Id Of HRBP',
    };
    const content = [
      rbinSourceColumns.map((column) => labels[column] ?? column).join(','),
      rbinSourceColumns.map((column) => csvValue(values[column])).join(','),
    ].join('\n');

    const parsed = await parseRbinFile(csvFile(content));

    expect(parsed[0].values.hrbp_global_id).toBe('45678');
    expect(parsed[0].values.hrbp2_global_id).toBe('HRBP2');
  });

  it('rejects a missing raw source column', async () => {
    const values = rawValues();
    const columns = rbinSourceColumns.filter((column) => column !== 'other_designation');
    const content = [
      columns.join(','),
      columns.map((column) => csvValue(values[column])).join(','),
    ].join('\n');

    await expect(parseRbinFile(csvFile(content))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stages only PS rows and derives Range and Function independently', () => {
    const parsed = [
      { rowNumber: 2, values: rawValues() },
      { rowNumber: 3, values: rawValues({ pers_no: '12346', organisational_area_pa: 'Other' }) },
    ];
    const staged = transformRbinRows(parsed, {
      ranges: new Map([['nap/mfn12', 'NaP']]),
      functions: new Map([['nap/mfn12', 'MG']]),
    }, new Map());

    expect(staged).toHaveLength(1);
    expect(staged[0].values.range).toBe('NaP');
    expect(staged[0].values.function).toBe('MG');
    expect(staged[0].values).not.toHaveProperty('other_designation');
  });

  it('requires Function for Outbound when no mapping exists', () => {
    const staged = transformRbinRows([
      { rowNumber: 2, values: rawValues({ employee_group: 'Outbound' }) },
    ], {
      ranges: new Map([['nap/mfn12', 'NaP']]),
      functions: new Map(),
    }, new Map());

    expect(staged[0].issues).toContainEqual({
      column: 'function',
      code: 'mapping_not_found',
      message: 'Function mapping not found for this Organizational Unit.',
    });
  });

  it('applies employee exceptions before validation and baseline comparison', () => {
    const baseline = transformRbinRows([{
      rowNumber: 2,
      values: rawValues(),
    }], {
      ranges: new Map([['nap/mfn12', 'NaP']]),
      functions: new Map([['nap/mfn12', 'MG']]),
    }, new Map())[0].values;
    const exceptions = new Map([['12345', new Map([
      ['range' as const, 'Fixed Range'],
      ['official_email' as const, 'fixed@example.com'],
    ])]]);

    const staged = transformRbinRows([{ rowNumber: 2, values: rawValues() }], {
      ranges: new Map([['nap/mfn12', 'Mapped Range']]),
      functions: new Map([['nap/mfn12', 'MG']]),
    }, new Map([['12345', baseline]]), exceptions);

    expect(staged[0].values.range).toBe('Fixed Range');
    expect(staged[0].rangeSource).toBe('exception');
    expect(staged[0].issues).not.toEqual(expect.arrayContaining([expect.objectContaining({ column: 'official_email' })]));
    expect(staged[0].changedColumns).toEqual(expect.arrayContaining(['range', 'official_email']));
    expect(staged[0].originalValues.range).toBe('Fixed Range');
  });

  it('uses an Organisational Area exception when selecting PS rows', () => {
    const exceptions = new Map([['12345', new Map([
      ['organisational_area_pa' as const, 'PS'],
    ])]]);

    const staged = transformRbinRows([{
      rowNumber: 2,
      values: rawValues({ organisational_area_pa: 'Other' }),
    }], {
      ranges: new Map([['nap/mfn12', 'NaP']]),
      functions: new Map([['nap/mfn12', 'MG']]),
    }, new Map(), exceptions);

    expect(staged).toHaveLength(1);
    expect(staged[0].values.organisational_area_pa).toBe('PS');
  });

  it('marks every duplicate employee number invalid', () => {
    const rows = transformRbinRows([
      { rowNumber: 2, values: rawValues() },
      { rowNumber: 3, values: rawValues() },
    ], {
      ranges: new Map([['nap/mfn12', 'NaP']]),
      functions: new Map([['nap/mfn12', 'MG']]),
    }, new Map());

    applyDuplicateIssues(rows);

    expect(rows.every((row) => row.issues.some((issue) => issue.code === 'duplicate'))).toBe(true);
  });

  it('rejects identifiers outside the PostgreSQL BIGINT range', () => {
    const staged = transformRbinRows([
      { rowNumber: 2, values: rawValues({ pers_no: '9223372036854775808' }) },
    ], {
      ranges: new Map([['nap/mfn12', 'NaP']]),
      functions: new Map([['nap/mfn12', 'MG']]),
    }, new Map());

    expect(validateRbinStagedValues(staged[0].values)).toContainEqual({
      column: 'pers_no',
      code: 'invalid',
      message: 'Enter a positive whole number within the BIGINT range.',
    });
  });

  it('compares transformed values against the frozen live baseline', () => {
    const initial = transformRbinRows([
      { rowNumber: 2, values: rawValues() },
    ], {
      ranges: new Map([['nap/mfn12', 'NaP']]),
      functions: new Map([['nap/mfn12', 'MG']]),
    }, new Map());
    const baseline = new Map([[initial[0].values.pers_no, {
      ...initial[0].values,
      designation_text: 'Previous designation',
    }]]);

    const compared = transformRbinRows([
      { rowNumber: 2, values: rawValues() },
    ], {
      ranges: new Map([['nap/mfn12', 'NaP']]),
      functions: new Map([['nap/mfn12', 'MG']]),
    }, baseline);

    expect(compared[0].comparisonStatus).toBe('changed');
    expect(compared[0].changedColumns).toContain('designation_text');
  });
});

describe('RBIN career detection', () => {
  const row = (overrides: Partial<ReturnType<typeof rawValues>> = {}) => ({
    rowNumber: 2,
    values: rawValues(overrides),
  });

  it('tracks entry to PS with old and new organization values', () => {
    const events = detectCareerEvents(
      [row({ organisational_area_pa: 'Other', organizational_unit: 'OLD', ps_group: 'A' })],
      [row({ organisational_area_pa: 'PS', organizational_unit: 'NEW', ps_group: 'B' })],
    );
    expect(events).toEqual([expect.objectContaining({
      persNo: '12345', eventType: 'entry_to_ps',
      oldOrganizationalUnit: 'OLD', newOrganizationalUnit: 'NEW',
      oldPsGroup: 'A', newPsGroup: 'B',
    })]);
  });

  it('tracks one internal PS event when Org Unit or PS Group changes', () => {
    const events = detectCareerEvents(
      [row({ organisational_area_pa: 'PS', organizational_unit: 'OLD', ps_group: 'A' })],
      [row({ organisational_area_pa: ' ps ', organizational_unit: 'NEW', ps_group: 'B' })],
    );
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('internal_ps_change');
  });

  it('ignores exits, new employees, unchanged rows, and duplicate identifiers', () => {
    expect(detectCareerEvents(
      [row({ organisational_area_pa: 'PS' })],
      [row({ organisational_area_pa: 'Other' })],
    )).toEqual([]);
    expect(detectCareerEvents([], [row({ organisational_area_pa: 'PS' })])).toEqual([]);
    expect(detectCareerEvents([row()], [row()])).toEqual([]);
    expect(detectCareerEvents([row()], [row(), { ...row(), rowNumber: 3 }])).toEqual([]);
  });
});