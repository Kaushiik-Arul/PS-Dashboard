import { RbinCleaningRepository } from './rbin-cleaning.repository';
import type { RbinBatchSummary, RbinExport, RbinPreviewPage, UploadedRbinFile } from './rbin-cleaning.types';
export declare class RbinCleaningService {
    private readonly repository;
    private readonly logger;
    constructor(repository: RbinCleaningRepository);
    createPreview(file: UploadedRbinFile | undefined, actorAccountId: string): Promise<RbinBatchSummary>;
    listBatches(actorAccountId: string): Promise<RbinBatchSummary[]>;
    getRows(batchId: string, actorAccountId: string, filterInput: string | undefined, pageInput: string | undefined, pageSizeInput: string | undefined, searchInput: string | undefined, viewInput: string | undefined): Promise<RbinPreviewPage>;
    updateRow(batchId: string, rowNumberInput: string, input: unknown, actorAccountId: string): Promise<RbinBatchSummary>;
    finalize(batchId: string, actorAccountId: string): Promise<RbinBatchSummary>;
    exportBatch(batchId: string, actorAccountId: string): Promise<RbinExport>;
    private validateRowInput;
    private positiveInteger;
    private isPostgresBigInt;
    private runDatabaseOperation;
}
