import type { RbinExceptionColumn } from '../namelist-import/namelist-import.types';

export const rbinExceptionColumnLabels: Readonly<Record<RbinExceptionColumn, string>> = {
  employee_group: 'Employee Group', lp: 'LP', esgrp: 'ESgrp', employee_subgroup: 'Employee Subgroup',
  ps_group: 'PS Group', organizational_unit: 'Organizational Unit', range: 'Range', function: 'Function',
  organisational_area_pa: 'Organisational Area (PA)', gender_key: 'Gender Key', location: 'Location', pa: 'PA',
  personnel_area: 'Personnel Area', psubarea: 'PSubarea', personnel_subarea: 'Personnel Subarea', nt_id: 'NT ID',
  global_id: 'Global ID', cost_center: 'Cost Center', birth_date: 'Birth Date', joining_date: 'Date of Joining',
  entry_for_retirement: 'Entry for Retirement', designation_text: 'Designation Text', hrbp_global_id: 'Global ID of HRBP',
  hrbp2_global_id: 'Global ID of HRBP2', official_email: 'Official Email', technical_entry_date: 'Technical Entry Date',
  direct_or_indirect: 'Direct or Indirect',
};

export type RbinExceptionColumnOption = { key: RbinExceptionColumn; label: string };
export type RbinException = {
  id: string;
  persNo: string;
  columnName: RbinExceptionColumn;
  columnLabel: string;
  fixedValue: string;
  updatedAt: string;
  updatedBy: string;
};
export type RbinExceptionRuleInput = { columnName: RbinExceptionColumn; fixedValue: string };
export type RbinExceptionInput = { persNo: string; columnName: RbinExceptionColumn; fixedValue: string };
export type RbinExceptionPage = {
  items: RbinException[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  filter: string;
  columns: RbinExceptionColumnOption[];
};