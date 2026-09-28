export type PoolKind = 'development' | 'talent';
export const poolColumns = [
  'pers_no',
  'employee_name',
  'ps_group',
  'department',
  'department_feb',
  'range',
  'pool',
  'gender',
  'start_date',
  'end_date',
  'active_passive',
] as const;
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
export type PoolFile = { originalname: string; buffer: Buffer };
export const columnsFor = (kind: PoolKind): PoolColumn[] =>
  kind === 'development'
    ? [
        'pers_no',
        'employee_name',
        'ps_group',
        'department',
        'department_feb',
        'range',
        'pool',
        'start_date',
        'end_date',
      ]
    : [
        'pers_no',
        'employee_name',
        'ps_group',
        'department',
        'range',
        'pool',
        'gender',
        'start_date',
        'end_date',
        'active_passive',
      ];
export const emptyValues = (): PoolValues =>
  Object.fromEntries(poolColumns.map((key) => [key, ''])) as PoolValues;
export const hasErrors = (issues: PoolIssue[]) =>
  issues.some((issue) => issue.severity === 'error');
