import { type AvailableFile, type AvailableRow, type AvailableValues } from './available-talent.types';
export declare function cleanValues(input: unknown): AvailableValues;
export declare function validateAvailableRows(rows: AvailableRow[], employees: Map<string, Partial<AvailableValues>>, knownJds: Set<string>): AvailableRow[];
export declare function parseAvailableFile(file: AvailableFile): Promise<AvailableRow[]>;
