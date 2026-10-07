export const attritionColumns = [
  ["pers_no", "Pers.No.", "Employee details"],
  ["employee_name", "Employee name", "Employee details"],
  ["gender_key", "Gender", "Employee details"],
  ["ps_group", "PS group", "Employee details"],
  ["org_unit", "Org Unit", "Employee details"],
  ["range", "Range", "Employee details"],
  ["filter_value", "Filter", "Separation details"],
  ["reason_for_action", "Reason for Action", "Separation details"],
  ["detailed_reason_approved", "Detailed Reason - Approved", "Separation details"],
  ["initiated_date", "Initiated date", "Separation details"],
  ["lwd", "LWD", "Separation details"],
  ["e_separation_request_no", "E-Separation Request No", "Separation details"],
  ["to_org_unit", "To Org Unit", "Separation details"],
] as const;

export type AttritionColumn = (typeof attritionColumns)[number][0];
export type AttritionRecord = Record<AttritionColumn, string> & { id: string };
export type AttritionQueryFilters = {
  orgUnit?: string;
  range?: string;
  gender?: string;
};
export type AttritionFilterOptions = {
  orgUnit: string[];
  range: string[];
  gender: string[];
};
export type AttritionResponse = {
  revision: string;
  fileName: string | null;
  importedAt: string | null;
  rows: AttritionRecord[];
  filterOptions: AttritionFilterOptions;
};