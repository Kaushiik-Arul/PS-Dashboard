export const successionPlanningColumns = [
  ["entity", "Entity", "Position listing"],
  ["updated_by_name", "Updated By", "Position listing"],
  ["area", "Area", "Position listing"],
  ["position_jd_id", "JDID", "Position listing"],
  ["jd_name", "JD Name", "Position listing"],
  ["ipe_level", "IPE Level", "Position listing"],
  ["employee_subgroup", "E Sub grp", "Position listing"],
  ["criticality", "Critical / Niche / General", "Position listing"],
  ["priority", "High / Medium / Low", "Priority"],
  ["incumbent_pers_no", "E.No.", "Current incumbent"],
  ["incumbent_name", "Name", "Current incumbent"],
  ["incumbent_org_unit", "Org Unit", "Current incumbent"],
  ["incumbent_range", "Range", "Current incumbent"],
  ["incumbent_tenure_years", "In current position since (Years)", "Current incumbent"],
  ["incumbent_age", "Age", "Current incumbent"],
  ["incumbent_change_year", "Incumbent change expected (Year)", "Current incumbent"],
  ["incumbent_9_box_rating", "9 Box Rating (2024, 2025, 2026)", "Current incumbent"],
  ["reason_for_change", "Reason for change", "Current incumbent"],
  ["successor1_pers_no", "Employee Number 1", "Successor 1 identification"],
  ["successor1_name", "Successor 1", "Successor 1 identification"],
  ["successor1_dept_code", "Current Dept Code 1", "Successor 1 identification"],
  ["successor1_current_jd_id", "Current JDID 1", "Successor 1 identification"],
  ["successor1_readiness", "Readiness 1", "Successor 1 identification"],
  ["successor1_9_box_rating", "9 Box Rating 1", "Successor 1 identification"],
  ["successor1_idp_status", "IDP in HR Global (Development Dialog Form) 1", "Successor 1 identification"],
  ["successor2_pers_no", "Employee Number 2", "Successor 2 identification"],
  ["successor2_name", "Successor 2", "Successor 2 identification"],
  ["successor2_dept_code", "Current Dept Code 2", "Successor 2 identification"],
  ["successor2_current_jd_id", "Current JDID 2", "Successor 2 identification"],
  ["successor2_readiness", "Readiness 2", "Successor 2 identification"],
  ["successor2_9_box_rating", "9 Box Rating 2", "Successor 2 identification"],
  ["successor2_idp_status", "IDP in HR Global (Development Dialog Form) 2", "Successor 2 identification"],
] as const;

export type SuccessionPlanningColumn = (typeof successionPlanningColumns)[number][0];
export type SuccessionPlanningValues = Record<SuccessionPlanningColumn, string>;
export type SuccessionPlanningRecord = SuccessionPlanningValues & { id: string };
export type SuccessionPlanningQueryFilters = {
  reportingMonth?: string;
  functionName?: string;
  orgUnit?: string;
  range?: string;
  location?: string;
  gender?: string;
  directOrIndirect?: string;
};
export type SuccessionPlanningFilterOptions = {
  functionName: string[];
  orgUnit: string[];
  range: string[];
  location: string[];
  gender: string[];
  directOrIndirect: string[];
};
export type SuccessionPlanningHistoryState = {
  snapshotMonths: string[];
};
export type SuccessionPlanningIssue = {
  column: SuccessionPlanningColumn;
  employeeNumber: string;
  message: string;
  severity: "warning";
  occurrences: number;
};
export type SuccessionPlanningPreviewRow = {
  rowNumber: number;
  values: SuccessionPlanningValues;
  issues: SuccessionPlanningIssue[];
};
export type SuccessionPlanningWarningSummary = {
  employeeNumber: string;
  employeeName: string;
  occurrences: number;
  assignments: Array<{
    rowNumber: number;
    successor: 1 | 2;
    area: string;
    positionJdId: string;
    jdName: string;
    deptCode: string;
    currentJdId: string;
    readiness: string;
    rating: string;
    idpStatus: string;
  }>;
};
export type SuccessionPlanningPreview = {
  id: string;
  fileName: string;
  totalRows: number;
  warningRows: number;
  existingRows: number;
  filteredRows: number;
  page: number;
  rows: SuccessionPlanningPreviewRow[];
  warningSummaries: SuccessionPlanningWarningSummary[];
};
export type SuccessionPlanningResponse = {
  revision: string;
  fileName: string | null;
  importedAt: string | null;
  rows: SuccessionPlanningRecord[];
  filterOptions: SuccessionPlanningFilterOptions;
};
