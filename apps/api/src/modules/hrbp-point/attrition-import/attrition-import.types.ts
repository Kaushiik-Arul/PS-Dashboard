export const attritionColumns = [
  'pers_no',
  'employee_name',
  'ps_group',
  'gender_key',
  'filter_value',
  'reason_for_action',
  'detailed_reason_approved',
  'org_unit',
  'range',
  'initiated_date_raw',
  'lwd_raw',
  'e_separation_request_no',
  'to_org_unit',
] as const;

export type AttritionColumn = (typeof attritionColumns)[number];
export type AttritionValues = Record<AttritionColumn, string>;
export type AttritionRangeSource = 'uploaded' | 'inferred' | 'missing';
export type AttritionStoredValues = AttritionValues & {
  range_source: AttritionRangeSource;
};
export type AttritionIssue = {
  column: AttritionColumn;
  code:
    | 'required'
    | 'invalid'
    | 'duplicate'
    | 'range_inferred'
    | 'range_mapping_not_found';
  message: string;
  severity: 'error' | 'warning';
  occurrences?: number;
};
export type AttritionRow = {
  rowNumber: number;
  values: AttritionStoredValues;
  initiatedDate: string;
  lwd: string;
  issues: AttritionIssue[];
};
export type AttritionFile = {
  originalname: string;
  buffer: Buffer;
};

export const emptyAttritionValues = (): AttritionValues =>
  Object.fromEntries(
    attritionColumns.map((column) => [column, '']),
  ) as AttritionValues;