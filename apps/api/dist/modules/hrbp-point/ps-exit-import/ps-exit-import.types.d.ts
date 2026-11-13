import type { AttritionIssue, AttritionRow, AttritionStoredValues } from '../attrition-import/attrition-import.types';
export type PsExitClassification = 'resignation' | 'retirement' | 'out_of_ps_transfer';
export type PsExitIssue = Omit<AttritionIssue, 'code'> & {
    code: AttritionIssue['code'] | 'unknown_reason' | 'event_conflict';
};
export type PsExitRow = Omit<AttritionRow, 'issues'> & {
    issues: PsExitIssue[];
    classification: PsExitClassification | null;
};
export type PsExitPreviewRowData = AttritionStoredValues;
export type PsExitPreviewFilter = 'all' | 'warnings' | 'errors';
