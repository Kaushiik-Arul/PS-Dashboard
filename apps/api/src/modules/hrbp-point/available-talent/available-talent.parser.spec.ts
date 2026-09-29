import { validateAvailableRows } from './available-talent.parser';
import { emptyValues, type AvailableRow } from './available-talent.types';
const row = (persNo = '123'): AvailableRow => ({
  rowNumber: 2,
  values: { ...emptyValues(), pers_no: persNo, employee_name: 'Person' },
  issues: [],
});
describe('Available Talent validation', () => {
  it('allows external employees with a warning and optional empty fields', () => {
    const [result] = validateAvailableRows([row()], new Map(), new Set());
    expect(result.issues).toEqual([
      expect.objectContaining({ column: 'pers_no', severity: 'warning' }),
    ]);
  });
  it('recalculates duplicate errors after a duplicate is removed', () => {
    const rows = validateAvailableRows(
      [row(), { ...row(), rowNumber: 3 }],
      new Map(),
      new Set(),
    );
    expect(
      rows.every((r) => r.issues.some((i) => i.message.includes('Duplicate'))),
    ).toBe(true);
    const [remaining] = validateAvailableRows(
      rows.slice(0, 1),
      new Map(),
      new Set(),
    );
    expect(remaining.issues.some((i) => i.severity === 'error')).toBe(false);
    expect(remaining.issues.some((i) => i.severity === 'warning')).toBe(true);
  });
  it('retains manually entered differences and reports the namelist value', () => {
    const input = row();
    input.values.entity = 'Override';
    const [result] = validateAvailableRows(
      [input],
      new Map([['123', { employee_name: 'Person', entity: 'LP' }]]),
      new Set(),
    );
    expect(result.values.entity).toBe('Override');
    expect(result.issues).toEqual([
      expect.objectContaining({
        column: 'entity',
        severity: 'warning',
        message: expect.stringContaining('LP'),
      }),
    ]);
  });
  it('requires employee number and name, and warns for an unknown JDID', () => {
    const input = row('');
    input.values.employee_name = '';
    input.values.jd_id = 'UNKNOWN';
    const [result] = validateAvailableRows([input], new Map(), new Set());
    expect(
      result.issues.filter((i) => i.severity === 'error').map((i) => i.column),
    ).toEqual(['pers_no', 'employee_name']);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ column: 'jd_id', severity: 'warning' }),
    );
  });
});
