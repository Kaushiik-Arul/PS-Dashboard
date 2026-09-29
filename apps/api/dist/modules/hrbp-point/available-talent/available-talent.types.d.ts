export type AvailableKind = 'available';
export declare const availableColumns: readonly ["pers_no", "employee_name", "entity", "department", "hrbp", "preferences", "current_status", "comments", "jd_id"];
export type AvailableColumn = (typeof availableColumns)[number];
export type AvailableValues = Record<AvailableColumn, string>;
export type AvailableIssue = {
    column: AvailableColumn;
    message: string;
    severity: 'error' | 'warning';
};
export type AvailableRow = {
    rowNumber: number;
    values: AvailableValues;
    issues: AvailableIssue[];
};
export type AvailableFile = {
    originalname: string;
    buffer: Buffer;
};
export declare const emptyValues: () => AvailableValues;
export declare const hasErrors: (issues: AvailableIssue[]) => boolean;
