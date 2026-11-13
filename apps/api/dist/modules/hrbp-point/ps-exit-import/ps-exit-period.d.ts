import type { PsExitRow } from './ps-exit-import.types';
export declare function psExitPeriod(period: string): {
    period: string;
    periodStart: string;
    carryoverDate: string;
    carryoverPeriod: string;
    excludedMonthEndDate: string;
} | null;
export declare function isPsExitRowSelected(row: Pick<PsExitRow, 'lwd'>, period: string): boolean;
export declare function psExitSelectablePeriods(rows: readonly Pick<PsExitRow, 'lwd'>[]): string[];
