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
  year?: string;
  separationType?: string;
  orgUnit?: string;
  range?: string;
};
export type AttritionFilterOptions = {
  year: string[];
  separationType: string[];
  orgUnit: string[];
  range: string[];
};
export type AttritionResponse = {
  revision: string;
  fileName: string | null;
  importedAt: string | null;
  selectedYear: number;
  organizationScope: "unrestricted" | "range" | "rangeOrgUnit";
  rows: AttritionRecord[];
  filterOptions: AttritionFilterOptions;
  kpis: {
    total: number;
    resignations: number;
    transfers: number;
    retirements: number;
    female: number;
    averageHeadcount: number | null;
    attritionRate: number | null;
  };
  trend: Array<{
    month: number;
    count: number;
    headcount: number | null;
    rate: number | null;
  }>;
  reasons: Array<{ label: string; value: number }>;
};