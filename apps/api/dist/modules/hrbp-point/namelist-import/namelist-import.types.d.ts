export declare const namelistColumns: readonly ["pers_no", "personnel_number", "employee_group", "lp", "esgrp", "employee_subgroup", "ps_group", "organizational_unit", "range", "function", "organisational_area_pa", "gender_key", "location", "pa", "personnel_area", "psubarea", "personnel_subarea", "nt_id", "global_id", "cost_center", "birth_date", "joining_date", "entry_for_retirement", "designation_text", "hrbp_global_id", "hrbp2_global_id", "official_email", "technical_entry_date", "direct_or_indirect"];
export type NamelistColumn = (typeof namelistColumns)[number];
export type NamelistRowValues = Record<NamelistColumn, string>;
export type NamelistIssue = {
    column: NamelistColumn;
    message: string;
};
export type ParsedNamelistRow = {
    rowNumber: number;
    values: NamelistRowValues;
    issues: NamelistIssue[];
};
export type PreviewFilter = 'all' | 'valid' | 'invalid';
export type UploadedNamelistFile = {
    originalname: string;
    buffer: Buffer;
};
export type NamelistPreviewSummary = {
    id: string;
    fileName: string;
    reportingMonth: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    hasCurrentMonthImport: boolean;
};
export type NamelistPreviewPage = NamelistPreviewSummary & {
    rows: ParsedNamelistRow[];
    page: number;
    pageSize: number;
    filteredRows: number;
};
