import { type NamelistRowValues } from '../namelist-import/namelist-import.types';
import type { ParsedRbinRow, RbinBaselineValues, RbinExceptionContext, RbinIssue, RbinMappingContext, RbinStagedRow } from './rbin-cleaning.types';
export declare function normalizeLookupKey(value: string): string;
export declare function validateRbinStagedValues(values: NamelistRowValues): RbinIssue[];
export declare function compareWithBaseline(values: NamelistRowValues, baselineValues: RbinBaselineValues | null): Pick<RbinStagedRow, 'comparisonStatus' | 'changedColumns'>;
export declare function transformRbinRows(rows: ParsedRbinRow[], mappings: RbinMappingContext, baselines: ReadonlyMap<string, RbinBaselineValues>, exceptions?: RbinExceptionContext): RbinStagedRow[];
export declare function applyDuplicateIssues(rows: RbinStagedRow[]): void;
