import type { AttritionValues } from './attrition-import.types';

export type PsExitIssue = {
  column: keyof Omit<AttritionValues, 'range_source'>;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  occurrences?: number;
};

export type PsExitPreviewRow = {
  rowNumber: number;
  values: AttritionValues;
  initiatedDate: string;
  lwd: string;
  classification: 'resignation' | 'retirement' | 'out_of_ps_transfer' | null;
  issues: PsExitIssue[];
};

export type PsExitPreviewFilter = 'all' | 'warnings' | 'errors';

export type PsExitPreview = {
  id: string;
  fileName: string;
  totalRows: number;
  warningRows: number;
  errorRows: number;
  minimumLwd: string | null;
  maximumLwd: string | null;
  retainedPeriod: string | null;
  periods: string[];
  period: string;
  carryoverDate: string | null;
  excludedMonthEndDate: string | null;
  carryoverRows: number;
  filteredRows: number;
  page: number;
  rows: PsExitPreviewRow[];
};

export type PsExitCommitResult = {
  importedRows: number;
  retainedRows: number;
  retainedPeriod: string;
  carryoverRows: number;
  insertedEvents: number;
  updatedEvents: number;
  matchedCandidates: number;
  pendingPsExit: number;
};