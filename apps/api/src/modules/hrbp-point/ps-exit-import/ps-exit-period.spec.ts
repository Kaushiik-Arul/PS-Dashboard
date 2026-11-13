import { isPsExitRowSelected, psExitPeriod, psExitSelectablePeriods } from './ps-exit-period';

describe('PS Exit reconciliation periods', () => {
  it.each([
    ['2026-07', '2026-06-30'],
    ['2025-03', '2025-02-28'],
    ['2024-03', '2024-02-29'],
    ['2026-01', '2025-12-31'],
  ])('uses the final calendar day before %s as carryover', (period, carryoverDate) => {
    expect(psExitPeriod(period)?.carryoverDate).toBe(carryoverDate);
  });

  it('selects the prior month final day and current rows before current month-end', () => {
    expect(isPsExitRowSelected({ lwd: '2026-07-01' }, '2026-07')).toBe(true);
    expect(isPsExitRowSelected({ lwd: '2026-07-30' }, '2026-07')).toBe(true);
    expect(isPsExitRowSelected({ lwd: '2026-07-31' }, '2026-07')).toBe(false);
    expect(isPsExitRowSelected({ lwd: '2026-07-31' }, '2026-08')).toBe(true);
    expect(isPsExitRowSelected({ lwd: '2026-06-30' }, '2026-07')).toBe(true);
    expect(isPsExitRowSelected({ lwd: '2026-06-29' }, '2026-07')).toBe(false);
  });

  it('offers only the following month for a month-end row', () => {
    expect(psExitSelectablePeriods([{ lwd: '2026-06-30' }])).toEqual(['2026-07']);
  });

  it('rejects invalid period input', () => {
    expect(psExitPeriod('2026-13')).toBeNull();
    expect(psExitPeriod('July 2026')).toBeNull();
  });
});