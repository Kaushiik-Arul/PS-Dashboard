import { EmployeeJdImportRepository } from './employee-jd-import.repository';
import { type EmployeeJdPreviewPage, type EmployeeJdPreviewSummary, type UploadedEmployeeJdFile } from './employee-jd-import.types';
export declare class EmployeeJdImportService {
    private readonly repository;
    private readonly logger;
    constructor(repository: EmployeeJdImportRepository);
    createPreview(file: UploadedEmployeeJdFile | undefined, actorAccountId: string): Promise<EmployeeJdPreviewSummary>;
    getRows(previewId: string, actorAccountId: string, filterInput?: string, pageInput?: string, pageSizeInput?: string): Promise<EmployeeJdPreviewPage>;
    updateRow(previewId: string, rowNumberInput: string, input: unknown, actorAccountId: string): Promise<EmployeeJdPreviewSummary>;
    deleteRow(previewId: string, rowNumberInput: string, actorAccountId: string): Promise<void>;
    cancel(previewId: string, actorAccountId: string): Promise<void>;
    commit(previewId: string, confirmReplacement: unknown, actorAccountId: string): Promise<{
        totalRows: number;
        movements: number;
    }>;
    private revalidateRows;
    private validateRowInput;
    private positiveInteger;
    private run;
}
