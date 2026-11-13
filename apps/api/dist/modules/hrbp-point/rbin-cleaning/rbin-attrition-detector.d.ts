import type { AttritionCleanedRow, AttritionDetectionResult } from './rbin-attrition.types';
import type { ParsedRbinRow, RbinSourceValues } from './rbin-cleaning.types';
export declare function detectAttrition(previousRows: readonly {
    values: RbinSourceValues;
}[], currentRows: readonly ParsedRbinRow[], previousCleanedRows: readonly AttritionCleanedRow[], currentCleanedRows: readonly AttritionCleanedRow[], pendingCandidatePersNos?: readonly string[]): AttritionDetectionResult;
