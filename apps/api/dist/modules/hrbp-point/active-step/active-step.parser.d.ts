import { type StepFile, type StepIssue, type StepRow, type StepValues } from './active-step.types';
export declare function parsedDate(value: string): string | null;
export declare function validateStepRow(values: StepValues): StepIssue[];
export declare function parseStepFile(file: StepFile): Promise<StepRow[]>;
