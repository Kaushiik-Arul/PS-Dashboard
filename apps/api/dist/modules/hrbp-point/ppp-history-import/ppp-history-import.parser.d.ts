import { type ParsedPppImport, type PppImportColumn, type PppImportIssue, type PppImportRowValues, type UploadedPppFile } from './ppp-history-import.types';
export declare function validatePppImportRow(values: PppImportRowValues): PppImportIssue[];
export declare function parsePppHistoryFile(file: UploadedPppFile, currentYear?: number): Promise<ParsedPppImport>;
export declare function pppImportHeaderLabels(currentYear: number): Record<PppImportColumn, string>;
