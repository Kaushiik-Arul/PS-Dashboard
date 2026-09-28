import { type PoolFile, type PoolIssue, type PoolKind, type PoolRow, type PoolValues } from './pool-register.types';
export declare function poolDate(value: string, kind: PoolKind, column: 'start_date' | 'end_date'): {
    value?: string;
    error?: string;
};
export declare function cleanValues(input: unknown, kind: PoolKind): PoolValues;
export declare function validatePoolRow(values: PoolValues, kind: PoolKind): PoolIssue[];
export declare function validatePoolRows(rows: PoolRow[], kind: PoolKind, employees: Map<string, Partial<PoolValues>>): PoolRow[];
export declare function parsePoolFile(file: PoolFile, kind: PoolKind): Promise<PoolRow[]>;
