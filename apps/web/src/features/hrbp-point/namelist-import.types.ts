export const namelistColumns = [
  "pers_no", "personnel_number", "employee_group", "lp", "esgrp",
  "employee_subgroup", "ps_group", "organizational_unit", "range", "function",
  "organisational_area_pa", "gender_key", "location", "pa", "personnel_area",
  "psubarea", "personnel_subarea", "nt_id", "global_id", "cost_center",
  "birth_date", "joining_date", "entry_for_retirement", "designation_text",
  "hrbp_global_id", "hrbp2_global_id", "official_email", "technical_entry_date",
  "direct_or_indirect",
] as const;

export type NamelistColumn = (typeof namelistColumns)[number];
export type NamelistRowValues = Record<NamelistColumn, string>;

export type NamelistIssue = {
  column: NamelistColumn;
  message: string;
};

export type NamelistPreviewRow = {
  rowNumber: number;
  values: NamelistRowValues;
  issues: NamelistIssue[];
};

export type NamelistPreview = {
  id: string;
  fileName: string;
  reportingMonth: string;
  importMode: "live" | "historical";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  hasExistingMonthImport: boolean;
  rows: NamelistPreviewRow[];
  page: number;
  pageSize: number;
  filteredRows: number;
};

export type PreviewFilter = "all" | "valid" | "invalid";

export interface NamelistImportClient {
  createPreview(file: File, reportingMonth: string, importMode: "live" | "historical"): Promise<NamelistPreview>;
  getRows(previewId: string, filter: PreviewFilter, page: number, pageSize: number): Promise<NamelistPreview>;
  updateRow(previewId: string, row: NamelistPreviewRow, filter: PreviewFilter, page: number, pageSize: number): Promise<NamelistPreview>;
  cancel(previewId: string): Promise<void>;
  commit(preview: NamelistPreview, confirmReplacement: boolean): Promise<{ totalRows: number }>;
}