export const pppContextColumns = [
  'pers_no',
  'personnel_number',
  'employee_subgroup',
  'ps_group',
  'organizational_unit',
  'range',
  'function',
] as const;

export const pppMetricColumns = [
  'performance_current', 'position_current', 'person_current', 'tcl_current',
  'performance_previous', 'position_previous', 'person_previous', 'tcl_previous',
  'performance_oldest', 'position_oldest', 'person_oldest', 'tcl_oldest',
] as const;

export const pppImportColumns = [...pppContextColumns, ...pppMetricColumns] as const;

export type PppImportColumn = (typeof pppImportColumns)[number];
export type PppImportRowValues = Record<PppImportColumn, string>;
export type PppIssueSeverity = 'error' | 'warning';

export type PppImportIssue = {
  column: PppImportColumn;
  message: string;
  severity: PppIssueSeverity;
};

export type ParsedPppImportRow = {
  rowNumber: number;
  values: PppImportRowValues;
  issues: PppImportIssue[];
};

export type ParsedPppImport = {
  currentYear: number;
  rows: ParsedPppImportRow[];
};

export type PppPreviewFilter = 'all' | 'valid' | 'warning' | 'invalid';

export type UploadedPppFile = {
  originalname: string;
  buffer: Buffer;
};

export type PppPreviewSummary = {
  id: string;
  fileName: string;
  currentYear: number;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  hasExistingHistory: boolean;
};

export type PppPreviewPage = PppPreviewSummary & {
  rows: ParsedPppImportRow[];
  page: number;
  pageSize: number;
  filteredRows: number;
};
