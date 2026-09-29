export type AvailableKind = 'available';
export const availableColumns = [
  'pers_no',
  'employee_name',
  'entity',
  'department',
  'hrbp',
  'preferences',
  'current_status',
  'comments',
  'jd_id',
] as const;
export type AvailableColumn = (typeof availableColumns)[number];
export type AvailableValues = Record<AvailableColumn, string>;
export type AvailableIssue = {
  column: AvailableColumn;
  message: string;
  severity: 'error' | 'warning';
};
export type AvailableRow = {
  rowNumber: number;
  values: AvailableValues;
  issues: AvailableIssue[];
};
export type AvailableFile = { originalname: string; buffer: Buffer };
export const emptyValues = (): AvailableValues =>
  Object.fromEntries(
    availableColumns.map((key) => [key, '']),
  ) as AvailableValues;
export const hasErrors = (issues: AvailableIssue[]) =>
  issues.some((issue) => issue.severity === 'error');
