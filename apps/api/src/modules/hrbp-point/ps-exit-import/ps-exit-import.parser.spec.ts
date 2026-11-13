import { emptyAttritionValues, type AttritionStoredValues } from '../attrition-import/attrition-import.types';
import ExcelJS from 'exceljs';
import { classifyPsExitReason, parsePsExitFile, validatePsExitRows } from './ps-exit-import.parser';

function values(overrides: Partial<AttritionStoredValues> = {}): AttritionStoredValues {
  return {
    ...emptyAttritionValues(),
    pers_no: '1001',
    reason_for_action: 'Resignation',
    lwd_raw: '31.10.2026',
    range_source: 'missing',
    ...overrides,
  };
}

describe('PS Exit reason classification', () => {
  it.each([
    ['Resignation', 'resignation'],
    ['Immediate termination', 'resignation'],
    ['Dismissal - performance issue', 'resignation'],
    ['Retirement', 'retirement'],
    ['Death not related to work', 'retirement'],
    ['Intra-Bosch-Transfer', 'out_of_ps_transfer'],
  ])('classifies %s as %s', (reason, classification) => {
    expect(classifyPsExitReason(reason)).toBe(classification);
  });

  it('rejects reasons outside the approved mapping', () => {
    expect(classifyPsExitReason('Other')).toBeNull();
  });
});

describe('PS Exit workbook parsing', () => {
  it('accepts the supplied layout without optional Filter and To Org Unit columns', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('PS Exit');
    sheet.addRow([
      'Pers.No.', 'Personnel Number', 'PS group', 'Gender Key', 'Reason for Action',
      'Detailed Reason - Approved', 'Org Unit', 'Range', 'Initiated date', 'LWD',
      'E- Separation Request No',
    ]);
    sheet.addRow([
      '1001', 'Example Employee', 'PS2', 'F', 'Resignation', '', 'PS/ENG', 'NaP',
      '01.10.2026', '31.10.2026', 'SEP-1',
    ]);
    const buffer = await workbook.xlsx.writeBuffer();

    const rows = await parsePsExitFile({ originalname: 'ps-exit.xlsx', buffer: Buffer.from(buffer) });

    expect(rows).toHaveLength(1);
    expect(rows[0].values.filter_value).toBe('');
    expect(rows[0].values.to_org_unit).toBe('');
  });

  it('preserves calendar dates from Excel date cells without a timezone shift', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('PS Exit');
    sheet.addRow([
      'Pers.No.', 'Personnel Number', 'PS group', 'Gender Key', 'Reason for Action',
      'Detailed Reason - Approved', 'Org Unit', 'Range', 'Initiated date', 'LWD',
      'E- Separation Request No',
    ]);
    sheet.addRow([
      '32553326', 'Sandip Bhagwan Mali', 'GROUP3', 'Male', 'Resignation',
      'Quit Employment', 'NaP/MFC21', 'NaP', new Date(2026, 3, 1),
      new Date(2026, 5, 1), 'ESEP3255332600034',
    ]);
    const buffer = await workbook.xlsx.writeBuffer();

    const parsed = await parsePsExitFile({ originalname: 'ps-exit.xlsx', buffer: Buffer.from(buffer) });
    const [row] = validatePsExitRows(parsed, new Map());

    expect(row.initiatedDate).toBe('2026-04-01');
    expect(row.lwd).toBe('2026-06-01');
  });
});

describe('PS Exit validation', () => {
  it('requires a valid LWD and approved reason', () => {
    const rows = validatePsExitRows([
      { rowNumber: 2, values: values({ lwd_raw: '' }) },
      { rowNumber: 3, values: values({ pers_no: '1002', lwd_raw: '31.02.2026' }) },
      { rowNumber: 4, values: values({ pers_no: '1003', reason_for_action: 'Other' }) },
    ], new Map());

    expect(rows.every((row) => row.issues.some((issue) => issue.severity === 'error'))).toBe(true);
  });

  it('blocks multiple exits for one employee in the same LWD month', () => {
    const rows = validatePsExitRows([
      { rowNumber: 2, values: values({ lwd_raw: '01.10.2026' }) },
      { rowNumber: 3, values: values({ lwd_raw: '31.10.2026' }) },
    ], new Map());

    expect(rows.every((row) => row.issues.some((issue) => issue.code === 'duplicate' && issue.severity === 'error'))).toBe(true);
  });

  it('allows the same employee to exit in different months', () => {
    const rows = validatePsExitRows([
      { rowNumber: 2, values: values({ lwd_raw: '31.10.2025' }) },
      { rowNumber: 3, values: values({ lwd_raw: '31.10.2026' }) },
    ], new Map());

    expect(rows.flatMap((row) => row.issues).some((issue) => issue.code === 'duplicate')).toBe(false);
  });
});