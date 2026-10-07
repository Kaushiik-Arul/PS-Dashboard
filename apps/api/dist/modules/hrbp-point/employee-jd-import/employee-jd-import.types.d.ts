export declare const employeeJdColumns: readonly ["pers_no", "jd_id"];
export type EmployeeJdColumn = (typeof employeeJdColumns)[number];
export type EmployeeJdRowValues = Record<EmployeeJdColumn, string>;
export type EmployeeJdIssue = {
    column: EmployeeJdColumn;
    message: string;
    severity?: 'warning';
};
export declare const hasBlockingEmployeeJdIssues: (issues: EmployeeJdIssue[]) => boolean;
export type ParsedEmployeeJdRow = {
    rowNumber: number;
    values: EmployeeJdRowValues;
    issues: EmployeeJdIssue[];
};
export type EmployeeJdPreviewFilter = 'all' | 'valid' | 'warning' | 'invalid';
export type UploadedEmployeeJdFile = {
    originalname: string;
    buffer: Buffer;
};
export type EmployeeJdPreviewSummary = {
    id: string;
    fileName: string;
    reportingMonth: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    warningRows: number;
    hasExistingAssignments: boolean;
};
export type EmployeeJdPreviewPage = EmployeeJdPreviewSummary & {
    rows: ParsedEmployeeJdRow[];
    page: number;
    pageSize: number;
    filteredRows: number;
};
