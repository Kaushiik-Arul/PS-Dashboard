import ExcelJS from 'exceljs';
import {
  parseAttritionFile,
  validateAttritionRows,
} from './attrition-import.parser';
import {
  emptyAttritionValues,
  type AttritionStoredValues,
} from './attrition-import.types';

const headers = [
  'Pers.No.',
  'Personnel Number',
  'PS group',
  'Gender Key',
  'Filter',
  'Reason for Action',
  'Detailed Reason - Approved',
  'Org Unit',
  'Range',
  'Initiated date',
  'LWD',
  'E- Separation Request No',
  'To Org Unit',
];

function values(
  overrides: Partial<AttritionStoredValues> = {},
): AttritionStoredValues {
  return {
    ...emptyAttritionValues(),
    pers_no: '1001',
    range_source: 'missing',
    ...overrides,
  };
}

describe('Attrition workbook parsing', () => {
  it('maps the supplied headers and keeps optional cells blank', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attrition');
    sheet.addRow(['Attrition register']);
    sheet.addRow(headers);
    sheet.addRow([
      '1001', 'Example Person', 'PS2', 'F', '', 'Resignation', '',
      'Engineering', '', '06.12.2024', '9/30/2022', 'SEP-1', '',
    ]);
    const buffer = await workbook.xlsx.writeBuffer();

    const rows = await parseAttritionFile({
      originalname: 'attrition.xlsx',
      buffer: Buffer.from(buffer),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].rowNumber).toBe(3);
    expect(rows[0].values.pers_no).toBe('1001');
    expect(rows[0].values.employee_name).toBe('Example Person');
    expect(rows[0].values.range_source).toBe('missing');
  });

  it('requires exactly one worksheet', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Attrition').addRow(headers);
    workbook.addWorksheet('Notes');
    const buffer = await workbook.xlsx.writeBuffer();

    await expect(parseAttritionFile({
      originalname: 'attrition.xlsx',
      buffer: Buffer.from(buffer),
    })).rejects.toThrow('exactly one worksheet');
  });
});

describe('Attrition validation', () => {
  const mappings = new Map([['engineering', 'PS3']]);

  it('infers a blank Range through normalized Org Unit matching', () => {
    const [row] = validateAttritionRows([
      { rowNumber: 2, values: values({ org_unit: '  ENGINEERING ' }) },
    ], mappings);

    expect(row.values.range).toBe('PS3');
    expect(row.values.range_source).toBe('inferred');
    expect(row.issues).toContainEqual(expect.objectContaining({
      code: 'range_inferred',
      severity: 'warning',
    }));
  });

  it('does not overwrite an uploaded or explicitly edited Range', () => {
    const [uploaded, cleared] = validateAttritionRows([
      { rowNumber: 2, values: values({ org_unit: 'Engineering', range: 'PS4', range_source: 'uploaded' }) },
      { rowNumber: 3, values: values({ pers_no: '1002', org_unit: 'Engineering', range: '', range_source: 'uploaded' }) },
    ], mappings);

    expect(uploaded.values.range).toBe('PS4');
    expect(uploaded.issues).toEqual([]);
    expect(cleared.values.range).toBe('');
    expect(cleared.issues).toEqual([]);
  });

  it('normalizes both dates to DD.MM.YYYY and warns without blocking invalid dates', () => {
    const [valid, invalid] = validateAttritionRows([
      { rowNumber: 2, values: values({ initiated_date_raw: '6.12.2024', lwd_raw: '30.11.2024' }) },
      { rowNumber: 3, values: values({ pers_no: '1002', initiated_date_raw: '31.02.2024', lwd_raw: '30/9/2022' }) },
    ], new Map());

    expect(valid.initiatedDate).toBe('2024-12-06');
    expect(valid.lwd).toBe('2024-11-30');
    expect(valid.values.initiated_date_raw).toBe('06.12.2024');
    expect(valid.values.lwd_raw).toBe('30.11.2024');
    expect(invalid.initiatedDate).toBe('');
    expect(invalid.lwd).toBe('');
    expect(invalid.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ column: 'initiated_date_raw', severity: 'warning' }),
      expect.objectContaining({ column: 'lwd_raw', severity: 'warning' }),
    ]));
  });

  it('blocks missing or invalid Pers.No. values', () => {
    const rows = validateAttritionRows([
      { rowNumber: 2, values: values({ pers_no: '' }) },
      { rowNumber: 3, values: values({ pers_no: '9223372036854775808' }) },
    ], new Map());

    expect(rows.every((row) => row.issues.some((issue) => issue.severity === 'error'))).toBe(true);
  });

  it('warns on every duplicate Pers.No. without producing an error', () => {
    const rows = validateAttritionRows([
      { rowNumber: 2, values: values() },
      { rowNumber: 3, values: values() },
    ], new Map());

    expect(rows.every((row) => row.issues.some((issue) => issue.code === 'duplicate'))).toBe(true);
    expect(rows.flatMap((row) => row.issues).some((issue) => issue.severity === 'error')).toBe(false);
  });
});