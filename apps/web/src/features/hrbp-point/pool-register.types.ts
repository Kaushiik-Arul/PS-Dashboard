export type PoolKind = "development" | "talent";
export const poolTitles = {
  development: "Development Pool Register",
  talent: "Talent Pool Register",
};
export const developmentColumns = [
  ["pers_no", "E. No."],
  ["employee_name", "Employee Name"],
  ["ps_group", "Current Grp"],
  ["department", "Department"],
  ["department_feb", "Department Feb"],
  ["range", "Range"],
  ["pool", "Development Pool"],
  ["start_date", "Pool Start Date"],
  ["end_date", "Pool End Date"],
] as const;
export const talentColumns = [
  ["pers_no", "Pers.No."],
  ["employee_name", "E Name"],
  ["ps_group", "PS Group"],
  ["department", "Organizational Unit"],
  ["range", "Range"],
  ["pool", "Talent Pool"],
  ["gender", "Gender"],
  ["start_date", "Talent Pool From"],
  ["end_date", "Talent Pool To"],
  ["active_passive", "Active/Passive"],
] as const;
export type PoolColumn =
  (typeof developmentColumns)[number][0] | (typeof talentColumns)[number][0];
export type PoolValues = Record<PoolColumn, string>;
export type PoolRecord = PoolValues & { id: string };
export type PoolIssue = {
  column: PoolColumn;
  message: string;
  severity: "error" | "warning";
};
export type PoolPreviewRow = {
  rowNumber: number;
  values: PoolValues;
  issues: PoolIssue[];
};
export type PoolPreview = {
  id: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  existingRows: number;
  filteredRows: number;
  page: number;
  rows: PoolPreviewRow[];
};
export const columnsFor = (kind: PoolKind) =>
  kind === "development" ? developmentColumns : talentColumns;
export const emptyPoolValues = (): PoolValues => ({
  pers_no: "",
  employee_name: "",
  ps_group: "",
  department: "",
  department_feb: "",
  range: "",
  pool: "",
  gender: "",
  start_date: "",
  end_date: "",
  active_passive: "",
});
export const hasErrors = (issues: PoolIssue[]) =>
  issues.some((issue) => issue.severity === "error");
