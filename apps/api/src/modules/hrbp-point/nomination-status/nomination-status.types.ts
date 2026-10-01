export const nominationStatusColumns = [
  'year',
  'corp_plant',
  'range',
  'department',
  'employee_no',
  'employee_name',
  'talent_pool',
  'result',
  'admission',
] as const;

export type NominationStatusColumn = (typeof nominationStatusColumns)[number];
export type NominationStatusResult = 'Cleared' | 'Amber' | 'Not Cleared';
export type NominationStatusValues = Record<NominationStatusColumn, string>;
export type NominationStatusIssue = {
  column: NominationStatusColumn;
  message: string;
  severity: 'error';
};
export type NominationStatusRow = {
  rowNumber: number;
  values: NominationStatusValues;
  issues: NominationStatusIssue[];
};
export type NominationStatusFile = {
  originalname: string;
  buffer: Buffer;
};

export const emptyNominationStatusValues = (): NominationStatusValues =>
  Object.fromEntries(
    nominationStatusColumns.map((column) => [column, '']),
  ) as NominationStatusValues;

export const hasNominationStatusErrors = (issues: NominationStatusIssue[]) =>
  issues.length > 0;