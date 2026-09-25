export const pppImportColumns = [
  "pers_no", "personnel_number", "employee_subgroup", "ps_group", "organizational_unit", "range", "function",
  "performance_current", "position_current", "person_current", "tcl_current",
  "performance_previous", "position_previous", "person_previous", "tcl_previous",
  "performance_oldest", "position_oldest", "person_oldest", "tcl_oldest",
] as const;

export type PppImportColumn = (typeof pppImportColumns)[number];
export type PppImportRowValues = Record<PppImportColumn, string>;
export type PppPreviewFilter = "all" | "valid" | "warning" | "invalid";

export type PppImportIssue = {
  column: PppImportColumn;
  message: string;
  severity: "error" | "warning";
};

export type PppPreviewRow = {
  rowNumber: number;
  values: PppImportRowValues;
  issues: PppImportIssue[];
};

export type PppPreview = {
  id: string;
  fileName: string;
  currentYear: number;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  hasExistingHistory: boolean;
  rows: PppPreviewRow[];
  page: number;
  pageSize: number;
  filteredRows: number;
};

export type PppCommitResult = { employees: number; yearlyRows: number; skippedRows: number };

export interface PppHistoryImportClient {
  createPreview(file: File): Promise<PppPreview>;
  getRows(previewId: string, filter: PppPreviewFilter, page: number, pageSize: number): Promise<PppPreview>;
  updateRow(previewId: string, row: PppPreviewRow, filter: PppPreviewFilter, page: number, pageSize: number): Promise<PppPreview>;
  cancel(previewId: string): Promise<void>;
  commit(preview: PppPreview, confirmReplacement: boolean): Promise<PppCommitResult>;
}

export function pppColumnLabel(column: PppImportColumn, currentYear: number): string {
  const contextLabels: Partial<Record<PppImportColumn, string>> = {
    pers_no: "Pers.No.", personnel_number: "Personnel Number", employee_subgroup: "Employee Subgroup",
    ps_group: "PS group", organizational_unit: "Organizational Unit", range: "Range", function: "Function",
  };
  if (contextLabels[column]) return contextLabels[column];
  const [metric, slot] = column.split("_");
  const year = slot === "current" ? currentYear : slot === "previous" ? currentYear - 1 : currentYear - 2;
  return `${year} ${metric[0].toUpperCase()}${metric.slice(1)}${slot === "current" ? " Current" : ""}`;
}
