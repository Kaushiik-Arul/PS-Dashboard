import { type NamelistPreviewPage, type NamelistPreviewSummary, type UploadedNamelistFile } from './namelist-import.types';
import { NamelistImportRepository } from './namelist-import.repository';
export declare class NamelistImportService {
    private readonly repository;
    private readonly logger;
    constructor(repository: NamelistImportRepository);
    createPreview(file: UploadedNamelistFile | undefined, reportingMonthInput: string | undefined, actorAccountId: string): Promise<NamelistPreviewSummary>;
    createHistoricalPreview(file: UploadedNamelistFile | undefined, reportingMonthInput: string | undefined, actorAccountId: string): Promise<NamelistPreviewSummary>;
    private createPreviewForMode;
    getRows(previewId: string, actorAccountId: string, filterInput: string | undefined, pageInput: string | undefined, pageSizeInput: string | undefined): Promise<NamelistPreviewPage>;
    updateRow(previewId: string, rowNumberInput: string, input: unknown, actorAccountId: string): Promise<NamelistPreviewSummary>;
    cancel(previewId: string, actorAccountId: string): Promise<void>;
    commit(previewId: string, confirmReplacement: unknown, actorAccountId: string): Promise<{
        totalRows: number;
    }>;
    commitHistorical(previewId: string, confirmReplacement: unknown, actorAccountId: string): Promise<{
        totalRows: number;
    }>;
    private validateRowInput;
    private positiveInteger;
    private reportingMonth;
    private runDatabaseOperation;
}
