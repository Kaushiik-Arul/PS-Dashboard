import type { AuthenticatedUser } from '../../auth/auth.types';
import { ActiveStepService } from './active-step.service';
import type { StepFile } from './active-step.types';
export declare class ActiveStepController {
    private readonly service;
    constructor(service: ActiveStepService);
    list(actor: AuthenticatedUser): Promise<Record<string, string | number | null>[]>;
    createPreview(file: StepFile | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
    }>;
    getRows(id: string, filter: string | undefined, page: string | undefined, actor: AuthenticatedUser): Promise<{
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
            values: import("./active-step.types").StepValues;
            issues: import("./active-step.types").StepIssue[];
        }[];
    }>;
    updateRow(id: string, rowNumber: string, values: unknown, actor: AuthenticatedUser): Promise<void>;
    deleteRow(id: string, rowNumber: string, actor: AuthenticatedUser): Promise<void>;
    cancel(id: string, actor: AuthenticatedUser): Promise<void>;
    commit(id: string, confirmation: unknown, actor: AuthenticatedUser): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
