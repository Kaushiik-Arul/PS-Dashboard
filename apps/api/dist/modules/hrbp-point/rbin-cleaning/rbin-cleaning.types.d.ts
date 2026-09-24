import type { NamelistColumn, NamelistRowValues, RbinExceptionColumn } from '../namelist-import/namelist-import.types';
export declare const rbinSourceColumns: readonly ["pers_no", "personnel_number", "joining_date", "pa", "personnel_area", "employee_group", "esgrp", "employee_subgroup", "psubarea", "personnel_subarea", "lp", "cost_center", "organizational_unit", "location", "organisational_area_pa", "gender_key", "global_id", "ps_group", "birth_date", "nt_id", "designation_text", "other_designation", "entry_for_retirement", "technical_entry_date", "official_email", "direct_or_indirect", "hrbp_global_id", "hrbp2_global_id"];
export type RbinSourceColumn = (typeof rbinSourceColumns)[number];
export type RbinSourceValues = Record<RbinSourceColumn, string>;
export type UploadedRbinFile = {
    originalname: string;
    buffer: Buffer;
};
export type ParsedRbinRow = {
    rowNumber: number;
    values: RbinSourceValues;
};
export type RbinIssue = {
    column: NamelistColumn;
    code: 'required' | 'mapping_not_found' | 'invalid' | 'duplicate';
    message: string;
};
export type MappingSource = 'mapping' | 'exception' | 'manual' | 'missing';
export type ComparisonStatus = 'new' | 'changed' | 'unchanged';
export type RbinBatchStatus = 'draft' | 'ready_for_export' | 'exported';
export type RbinRowFilter = 'all' | 'valid' | 'invalid' | ComparisonStatus;
export type RbinColumnView = 'key' | 'all';
export type RbinBaselineValues = NamelistRowValues;
export type RbinStagedRow = {
    rowNumber: number;
    originalValues: NamelistRowValues;
    values: NamelistRowValues;
    issues: RbinIssue[];
    comparisonStatus: ComparisonStatus;
    baselineValues: RbinBaselineValues | null;
    changedColumns: NamelistColumn[];
    rangeSource: MappingSource;
    functionSource: MappingSource;
};
export type RbinMappingAlert = {
    organizationalUnit: string;
    rowCount: number;
    missingRange: boolean;
    missingFunction: boolean;
};
export type RbinBatchSummary = {
    id: string;
    fileName: string;
    createdAt: string;
    status: RbinBatchStatus;
    totalRawRows: number;
    stagedRows: number;
    excludedRows: number;
    validRows: number;
    invalidRows: number;
    newRows: number;
    changedRows: number;
    unchangedRows: number;
    mappingAlerts: RbinMappingAlert[];
    firstExportedAt: string | null;
    lastExportedAt: string | null;
};
export type RbinPreviewPage = RbinBatchSummary & {
    rows: RbinStagedRow[];
    filter: RbinRowFilter;
    search: string;
    page: number;
    pageSize: number;
    filteredRows: number;
};
export type RbinMappingContext = {
    ranges: ReadonlyMap<string, string>;
    functions: ReadonlyMap<string, string>;
};
export type RbinExport = {
    fileName: string;
    buffer: Buffer;
};
export type RbinExceptionContext = ReadonlyMap<string, ReadonlyMap<RbinExceptionColumn, string>>;
