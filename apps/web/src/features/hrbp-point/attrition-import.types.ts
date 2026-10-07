export const attritionColumns = [
  ["pers_no", "Pers.No.", "Employee"],
  ["employee_name", "Personnel Number", "Employee"],
  ["ps_group", "PS group", "Employee"],
  ["gender_key", "Gender Key", "Employee"],
  ["filter_value", "Filter", "Action"],
  ["reason_for_action", "Reason for Action", "Action"],
  ["detailed_reason_approved", "Detailed Reason - Approved", "Action"],
  ["org_unit", "Org Unit", "Movement"],
  ["range", "Range", "Movement"],
  ["to_org_unit", "To Org Unit", "Movement"],
  ["initiated_date_raw", "Initiated date", "Separation"],
  ["lwd_raw", "LWD", "Separation"],
  ["e_separation_request_no", "E-Separation Request No", "Separation"],
] as const;

export type AttritionColumn = (typeof attritionColumns)[number][0];
export type AttritionValues = Record<AttritionColumn, string> & {
  range_source: "uploaded" | "inferred" | "missing";
};
export type AttritionIssue = {
  column: AttritionColumn;
  code: "required" | "invalid" | "duplicate" | "range_inferred" | "range_mapping_not_found";
  message: string;
  severity: "error" | "warning";
  occurrences?: number;
};
export type AttritionPreviewRow = {
  rowNumber: number;
  values: AttritionValues;
  initiatedDate: string;
  lwd: string;
  issues: AttritionIssue[];
};
export type AttritionPreviewFilter = "all" | "warnings" | "errors";
export type AttritionPreview = {
  id: string;
  fileName: string;
  totalRows: number;
  warningRows: number;
  errorRows: number;
  existingRows: number;
  filteredRows: number;
  page: number;
  rows: AttritionPreviewRow[];
};