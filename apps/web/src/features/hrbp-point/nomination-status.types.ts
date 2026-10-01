export const nominationStatusColumns = [
  ['year', 'Year'],
  ['corp_plant', 'Corp/Plant'],
  ['range', 'Range'],
  ['department', 'Department'],
  ['employee_no', 'E No'],
  ['employee_name', 'Name'],
  ['talent_pool', 'TP'],
  ['result', 'Result'],
  ['admission', 'Admission'],
] as const;

export type NominationStatusColumn =
  (typeof nominationStatusColumns)[number][0];
export type NominationStatusValues = Record<NominationStatusColumn, string>;
export type NominationStatusIssue = {
  column: NominationStatusColumn;
  message: string;
  severity: 'error';
};
export type NominationStatusPreviewRow = {
  rowNumber: number;
  values: NominationStatusValues;
  issues: NominationStatusIssue[];
};
export type NominationStatusPreview = {
  id: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  existingRows: number;
  filteredRows: number;
  page: number;
  rows: NominationStatusPreviewRow[];
};

export const hasNominationStatusErrors = (
  issues: NominationStatusIssue[],
) => issues.length > 0;

export const nominationResultClass = (value: string) =>
  value === 'Cleared'
    ? 'is-cleared'
    : value === 'Amber'
      ? 'is-amber'
      : value === 'Not Cleared'
        ? 'is-not-cleared'
        : '';