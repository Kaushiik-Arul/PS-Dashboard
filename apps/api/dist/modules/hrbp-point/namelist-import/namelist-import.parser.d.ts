import { type NamelistIssue, type NamelistRowValues, type ParsedNamelistRow, type UploadedNamelistFile } from './namelist-import.types';
export declare function validateNamelistRow(values: NamelistRowValues): NamelistIssue[];
export declare function parseNamelistFile(file: UploadedNamelistFile): Promise<ParsedNamelistRow[]>;
