export declare const nominationStatusColumns: readonly ["year", "corp_plant", "range", "department", "employee_no", "employee_name", "talent_pool", "result", "admission"];
export type NominationStatusColumn = (typeof nominationStatusColumns)[number];
export type NominationStatusResult = 'Cleared' | 'Amber' | 'Not Cleared';
export type NominationStatusValues = Record<NominationStatusColumn, string>;
export type NominationStatusIssue = {
    column: NominationStatusColumn;
    message: string;
    severity: 'error';
};
export type NominationStatusRow = {
    rowNumber: number;
    values: NominationStatusValues;
    issues: NominationStatusIssue[];
};
export type NominationStatusFile = {
    originalname: string;
    buffer: Buffer;
};
export declare const emptyNominationStatusValues: () => NominationStatusValues;
export declare const hasNominationStatusErrors: (issues: NominationStatusIssue[]) => boolean;
