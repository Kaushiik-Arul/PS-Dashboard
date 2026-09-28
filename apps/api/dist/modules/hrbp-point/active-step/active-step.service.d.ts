import { ActiveStepRepository } from './active-step.repository';
import { type StepFile, type StepValues } from './active-step.types';
export declare class ActiveStepService {
    private readonly repository;
    private readonly logger;
    constructor(repository: ActiveStepRepository);
    createPreview(file: StepFile | undefined, actor: string): Promise<{
        id: string;
    }>;
    getRows(id: string, actor: string, filter?: string, page?: string): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        validRows: number;
        invalidRows: number;
        existingRows: number;
        filteredRows: number;
        page: number;
        rows: {
            rowNumber: number;
            values: StepValues;
            issues: import("./active-step.types").StepIssue[];
        }[];
    }>;
    updateRow(id: string, rowInput: string, input: unknown, actor: string): Promise<void>;
    deleteRow(id: string, rowInput: string, actor: string): Promise<void>;
    cancel(id: string, actor: string): Promise<void>;
    commit(id: string, confirmation: unknown, actor: string): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
    list(actor: string): Promise<Record<string, string | number | null>[]>;
    private validateId;
    private validateRowNumber;
    private validateValues;
    private run;
}
