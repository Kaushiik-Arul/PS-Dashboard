import type { AttritionFile, AttritionStoredValues } from '../attrition-import/attrition-import.types';
import type { PsExitClassification, PsExitRow } from './ps-exit-import.types';
export declare function classifyPsExitReason(value: string): PsExitClassification | null;
export declare function parsePsExitFile(file: AttritionFile): Promise<{
    rowNumber: number;
    values: AttritionStoredValues;
}[]>;
export declare function validatePsExitRows(rows: Array<{
    rowNumber: number;
    values: AttritionStoredValues;
}>, rangeMappings: ReadonlyMap<string, string>): PsExitRow[];
