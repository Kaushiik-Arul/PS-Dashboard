import { type SuccessionJdLookup, type SuccessionPlanningFile, type SuccessionPlanningRow, type SuccessionPlanningValues } from './succession-planning-import.types';
export declare function cleanSuccessionPlanningValues(input: unknown): SuccessionPlanningValues;
export declare function validateSuccessionPlanningRows(rows: SuccessionPlanningRow[], jdLookup: SuccessionJdLookup): SuccessionPlanningRow[];
export declare function parseSuccessionPlanningFile(file: SuccessionPlanningFile): Promise<SuccessionPlanningRow[]>;
