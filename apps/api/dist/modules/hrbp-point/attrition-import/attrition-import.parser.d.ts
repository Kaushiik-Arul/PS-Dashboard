import { type AttritionFile, type AttritionRow, type AttritionStoredValues, type AttritionValues } from './attrition-import.types';
export declare function cleanAttritionValues(input: unknown): AttritionValues;
export declare function cleanAttritionStoredValues(input: unknown): AttritionStoredValues;
export declare function validateAttritionRows(rows: Array<{
    rowNumber: number;
    values: AttritionStoredValues;
}>, rangeMappings: ReadonlyMap<string, string>): AttritionRow[];
export declare function parseAttritionFile(file: AttritionFile): Promise<{
    rowNumber: number;
    values: AttritionStoredValues;
}[]>;
