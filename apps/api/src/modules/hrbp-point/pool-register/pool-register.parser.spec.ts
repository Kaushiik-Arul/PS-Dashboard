import ExcelJS from 'exceljs';
import {
  cleanValues,
  parsePoolFile,
  poolDate,
  validatePoolRows,
} from './pool-register.parser';
import { emptyValues, hasErrors, type PoolRow } from './pool-register.types';
async function workbook(headers: string[], values: unknown[]) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Register');
  sheet.addRow(headers);
  sheet.addRow(values);
  return {
    originalname: 'pool.xlsx',
    buffer: Buffer.from(await book.xlsx.writeBuffer()),
  };
}
const devHeaders = [
  'E. No.',
  'Employee Name',
  'Current Grp',
  'Department',
  'Department Feb',
  'Range',
  'Development Pool',
  'Pool Start Date (dd/mm/yyyy)',
  'Pool End date (dd/mm/yyyy)',
];
const talentHeaders = [
  'Pers.No.',
  'E name',
  'PS group',
  'Organizational Unit',
  'Range',
  'Talent Pool',
  'Gender',
  'From',
  'To',
  'Active/Passive',
];
const valid = () =>
  cleanValues(
    {
      ...emptyValues(),
      pers_no: '123',
      employee_name: 'Employee',
      pool: 'Future Talent',
      start_date: '01.01.2025',
      end_date: '12/31/2027',
    },
    'development',
  );
describe('Pool register import', () => {
  it('converts Development dotted start and US end dates despite the header', async () => {
    const rows = await parsePoolFile(
      await workbook(devHeaders, [
        123,
        'Employee',
        'G4',
        'PS/SCP-IN',
        'Old',
        'R1',
        'Future',
        '01.01.2025',
        '12/31/2027',
      ]),
      'development',
    );
    expect(rows[0].values).toMatchObject({
      start_date: '2025-01-01',
      end_date: '2027-12-31',
      department_feb: 'Old',
    });
    expect(rows[0].issues).toEqual([]);
  });
  it('converts Talent dotted dates', async () => {
    const rows = await parsePoolFile(
      await workbook(talentHeaders, [
        123,
        'Employee',
        'G4',
        'PS/SCP-IN',
        'R1',
        'TP1',
        'Female',
        '01.02.2025',
        '31.12.2027',
        'Active',
      ]),
      'talent',
    );
    expect(rows[0].values).toMatchObject({
      start_date: '2025-02-01',
      end_date: '2027-12-31',
    });
    expect(rows[0].issues).toEqual([]);
  });
  it('handles Excel date cells', async () => {
    const rows = await parsePoolFile(
      await workbook(devHeaders, [
        123,
        'Employee',
        '',
        '',
        '',
        '',
        'Future',
        new Date('2025-02-01T00:00:00Z'),
        new Date('2027-12-31T00:00:00Z'),
      ]),
      'development',
    );
    expect(rows[0].values.start_date).toBe('2025-02-01');
    expect(rows[0].values.end_date).toBe('2027-12-31');
  });
  it('uses the agreed locale for ambiguous slash dates', () => {
    expect(poolDate('01/02/2027', 'development', 'end_date').value).toBe(
      '2027-01-02',
    );
    expect(poolDate('01/02/2027', 'talent', 'end_date').value).toBe(
      '2027-02-01',
    );
  });
  it('explains impossible dates and leap-year errors', () => {
    expect(poolDate('31.06.2028', 'talent', 'end_date').error).toContain(
      'June 2028 has 30 days',
    );
    expect(poolDate('29.02.2027', 'talent', 'start_date').error).toContain(
      'February 2027 has 28 days',
    );
    expect(poolDate('29.02.2028', 'talent', 'start_date').value).toBe(
      '2028-02-29',
    );
  });
  it('clears duplicate errors after deletion or editing', () => {
    const rows: PoolRow[] = [2, 3].map((rowNumber) => ({
      rowNumber,
      values: valid(),
      issues: [],
    }));
    const invalid = validatePoolRows(rows, 'development', new Map());
    expect(invalid.every((row) => hasErrors(row.issues))).toBe(true);
    expect(
      hasErrors(
        validatePoolRows(invalid.slice(0, 1), 'development', new Map())[0]
          .issues,
      ),
    ).toBe(false);
    invalid[1].values = { ...invalid[1].values, pers_no: '456' };
    expect(
      validatePoolRows(invalid, 'development', new Map()).some((row) =>
        hasErrors(row.issues),
      ),
    ).toBe(false);
  });
  it('retains missing employees and mismatches as warnings', () => {
    const row = { rowNumber: 2, values: valid(), issues: [] };
    expect(
      validatePoolRows([row], 'development', new Map())[0].issues[0],
    ).toMatchObject({ column: 'pers_no', severity: 'warning' });
    const mismatch = validatePoolRows(
      [row],
      'development',
      new Map([['123', { employee_name: 'Different name' }]]),
    )[0];
    expect(hasErrors(mismatch.issues)).toBe(false);
    expect(mismatch.issues).toContainEqual({
      column: 'employee_name',
      message:
        'Current namelist: Different name. Entered value will be retained.',
      severity: 'warning',
    });
    expect(mismatch.values.employee_name).toBe('Employee');
  });
  it('reports reversed periods and rejects incorrect headers', async () => {
    const row = {
      rowNumber: 2,
      values: { ...valid(), start_date: '2029-01-01' },
      issues: [],
    };
    expect(
      validatePoolRows([row], 'development', new Map())[0].issues,
    ).toContainEqual({
      column: 'end_date',
      message: 'End date must be on or after start date.',
      severity: 'error',
    });
    await expect(
      parsePoolFile(await workbook(talentHeaders, []), 'development'),
    ).rejects.toThrow('Unexpected column');
  });
});
