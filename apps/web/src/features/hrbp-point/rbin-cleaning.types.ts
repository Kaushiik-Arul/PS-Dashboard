import type { NamelistColumn, NamelistRowValues } from "./namelist-import.types";

export type RbinBatchStatus = "draft" | "ready_for_export" | "exported";
export type RbinComparisonStatus = "new" | "changed" | "unchanged";
export type RbinRowFilter = "all" | "valid" | "invalid" | RbinComparisonStatus;
export type RbinColumnView = "key" | "all";
export type MappingSource = "mapping" | "exception" | "manual" | "missing";

export type RbinIssue = {
  column: NamelistColumn;
  code: "required" | "mapping_not_found" | "invalid" | "duplicate";
  message: string;
};

export type RbinMappingAlert = {
  organizationalUnit: string;
  rowCount: number;
  missingRange: boolean;
  missingFunction: boolean;
};

export type RbinPreviewRow = {
  rowNumber: number;
  originalValues: NamelistRowValues;
  values: NamelistRowValues;
  issues: RbinIssue[];
  comparisonStatus: RbinComparisonStatus;
  baselineValues: NamelistRowValues | null;
  changedColumns: NamelistColumn[];
  rangeSource: MappingSource;
  functionSource: MappingSource;
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
  rows: RbinPreviewRow[];
  filter: RbinRowFilter;
  search: string;
  page: number;
  pageSize: number;
  filteredRows: number;
};

export interface RbinCleaningClient {
  listBatches(): Promise<RbinBatchSummary[]>;
  createPreview(file: File, pageSize: number): Promise<RbinPreviewPage>;
  getRows(batchId: string, filter: RbinRowFilter, page: number, pageSize: number, search: string, view: RbinColumnView): Promise<RbinPreviewPage>;
  updateRow(batchId: string, row: RbinPreviewRow, filter: RbinRowFilter, page: number, pageSize: number, search: string, view: RbinColumnView): Promise<RbinPreviewPage>;
  finalize(batchId: string, pageSize: number): Promise<RbinPreviewPage>;
  exportBatch(batchId: string): Promise<{ fileName: string; exportedAt: string }>;
}