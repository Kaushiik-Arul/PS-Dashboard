import { PppHistoryImportRepository } from './ppp-history-import.repository';
import { type PppPreviewPage, type PppPreviewSummary, type UploadedPppFile } from './ppp-history-import.types';
export declare class PppHistoryImportService {
    private readonly repository;
    private readonly logger;
    constructor(repository: PppHistoryImportRepository);
    createPreview(file: UploadedPppFile | undefined, actorAccountId: string): Promise<PppPreviewSummary>;
    getRows(previewId: string, actorAccountId: string, filterInput?: string, pageInput?: string, pageSizeInput?: string): Promise<PppPreviewPage>;
    updateRow(previewId: string, rowNumberInput: string, input: unknown, actorAccountId: string): Promise<PppPreviewSummary>;
    cancel(previewId: string, actorAccountId: string): Promise<void>;
    commit(previewId: string, confirmReplacement: unknown, actorAccountId: string): Promise<{
        employees: number;
        yearlyRows: number;
        skippedRows: number;
    }>;
    private revalidateRows;
    private validateRowInput;
    private positiveInteger;
    private run;
}
