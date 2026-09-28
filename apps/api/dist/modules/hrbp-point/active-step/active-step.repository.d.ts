import { DatabaseService } from '../../../database/database.service';
import type { StepFile, StepIssue, StepRow, StepValues } from './active-step.types';
export declare class ActiveStepRepository {
    private readonly database;
    constructor(database: DatabaseService);
    createPreview(file: StepFile, rows: StepRow[], actor: string): Promise<{
        id: string;
    }>;
    getPreview(id: string, actor: string, filter: string, page: number): Promise<{
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
            issues: StepIssue[];
        }[];
    }>;
    updateRow(id: string, actor: string, rowNumber: number, values: StepValues, issues: StepIssue[]): Promise<void>;
    deleteRow(id: string, actor: string, rowNumber: number): Promise<void>;
    private refreshCounts;
    cancel(id: string, actor: string): Promise<boolean>;
    commit(id: string, actor: string, confirmed: boolean): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
    list(actor: string): Promise<Record<string, string | number | null>[]>;
}
