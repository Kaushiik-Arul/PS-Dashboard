export declare const stepColumns: readonly ["sl_no", "year", "pers_no", "e_name", "grp", "initiated_by", "exchanged_with", "step_from", "step_to", "entity_from", "entity_to", "gb_from", "gb_to", "function_from", "function_to", "dept_from", "dept_to", "location_from", "location_to"];
export type StepColumn = (typeof stepColumns)[number];
export type StepValues = Record<StepColumn, string>;
export type StepIssue = {
    column: StepColumn;
    message: string;
};
export type StepRow = {
    rowNumber: number;
    values: StepValues;
    issues: StepIssue[];
};
export type StepFile = {
    originalname: string;
    buffer: Buffer;
};
