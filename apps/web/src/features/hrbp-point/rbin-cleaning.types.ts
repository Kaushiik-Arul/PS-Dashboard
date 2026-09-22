import type { NamelistColumn, NamelistRowValues } from "./namelist-import.types";

export type RbinBatchStatus = "draft" | "ready_for_export" | "exported";
export type RbinComparisonStatus = "new" | "changed" | "unchanged";
export type RbinRowFilter = "all" | "valid" | "invalid" | RbinComparisonStatus;
export type MappingSource = "mapping" | "manual" | "missing";

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
  page: number;
  pageSize: number;
  filteredRows: number;
};

export interface RbinCleaningClient {
  listBatches(): Promise<RbinBatchSummary[]>;
  createPreview(file: File): Promise<RbinPreviewPage>;
  getRows(batchId: string, filter: RbinRowFilter, page: number, pageSize: number): Promise<RbinPreviewPage>;
  updateRow(batchId: string, row: RbinPreviewRow, filter: RbinRowFilter, page: number, pageSize: number): Promise<RbinPreviewPage>;
  finalize(batchId: string): Promise<RbinPreviewPage>;
  exportBatch(batchId: string): Promise<{ fileName: string; exportedAt: string }>;
}