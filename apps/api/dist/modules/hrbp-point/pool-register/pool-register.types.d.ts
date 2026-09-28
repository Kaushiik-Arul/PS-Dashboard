export type PoolKind = 'development' | 'talent';
export declare const poolColumns: readonly ["pers_no", "employee_name", "ps_group", "department", "department_feb", "range", "pool", "gender", "start_date", "end_date", "active_passive"];
export type PoolColumn = (typeof poolColumns)[number];
export type PoolValues = Record<PoolColumn, string>;
export type PoolIssue = {
    column: PoolColumn;
    message: string;
    severity: 'error' | 'warning';
};
export type PoolRow = {
    rowNumber: number;
    values: PoolValues;
    issues: PoolIssue[];
};
export type PoolFile = {
    originalname: string;
    buffer: Buffer;
};
export declare const columnsFor: (kind: PoolKind) => PoolColumn[];
export declare const emptyValues: () => PoolValues;
export declare const hasErrors: (issues: PoolIssue[]) => boolean;
