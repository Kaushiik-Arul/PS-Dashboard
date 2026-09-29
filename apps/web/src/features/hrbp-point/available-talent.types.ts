export type AvailableKind = "available";
export const availableTitles = { available: "STEP-Available Talent (People)" };
export const availableColumns = [
  ["pers_no", "E.No."],
  ["employee_name", "E. Name"],
  ["entity", "Entity"],
  ["department", "Dept"],
  ["hrbp", "HRBP"],
  ["preferences", "Preferences"],
  ["current_status", "Current Status"],
  ["comments", "Comments"],
  ["jd_id", "JDID"],
] as const;
export const columnsFor = (kind: AvailableKind) => ({ available: availableColumns })[kind];
export type AvailableColumn = (typeof availableColumns)[number][0];
export type AvailableValues = Record<AvailableColumn, string>;
export type AvailableRecord = AvailableValues & { id: string };
export type AvailableIssue = {
  column: AvailableColumn;
  message: string;
  severity: "error" | "warning";
};
export type AvailablePreviewRow = {
  rowNumber: number;
  values: AvailableValues;
  issues: AvailableIssue[];
};
export type AvailablePreview = {
  id: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  existingRows: number;
  filteredRows: number;
  page: number;
  rows: AvailablePreviewRow[];
};
export const emptyAvailableValues = (): AvailableValues => ({
  pers_no: "",
  employee_name: "",
  entity: "",
  department: "",
  hrbp: "",
  preferences: "",
  current_status: "",
  comments: "",
  jd_id: "",
});
export const hasErrors = (issues: AvailableIssue[]) =>
  issues.some((issue) => issue.severity === "error");
