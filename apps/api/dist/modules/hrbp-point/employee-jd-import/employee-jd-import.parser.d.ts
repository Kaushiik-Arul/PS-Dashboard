import type { EmployeeJdIssue, EmployeeJdRowValues, ParsedEmployeeJdRow, UploadedEmployeeJdFile } from './employee-jd-import.types';
export declare function validateEmployeeJdRow(values: EmployeeJdRowValues): EmployeeJdIssue[];
export declare function parseEmployeeJdFile(file: UploadedEmployeeJdFile): Promise<ParsedEmployeeJdRow[]>;
