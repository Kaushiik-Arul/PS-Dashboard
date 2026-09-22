import { DatabaseService } from '../../../database/database.service';
import type { NamelistRowValues } from '../namelist-import/namelist-import.types';
import type { ParsedRbinRow, RbinBaselineValues, RbinBatchSummary, RbinMappingContext, RbinPreviewPage, RbinRowFilter, RbinStagedRow, UploadedRbinFile } from './rbin-cleaning.types';
export declare class RbinCleaningRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getMappings(): Promise<RbinMappingContext>;
    getBaselines(persNos: readonly string[]): Promise<Map<string, RbinBaselineValues>>;
    createBatch(actorAccountId: string, file: UploadedRbinFile, rawRows: ParsedRbinRow[], stagedRows: RbinStagedRow[]): Promise<string>;
    listBatches(actorAccountId: string): Promise<RbinBatchSummary[]>;
    getSummary(batchId: string, actorAccountId: string): Promise<RbinBatchSummary | null>;
    getRows(batchId: string, actorAccountId: string, filter: RbinRowFilter, page: number, pageSize: number): Promise<RbinPreviewPage | null>;
    getAllRows(batchId: string, actorAccountId: string): Promise<RbinStagedRow[] | null>;
    updateRows(batchId: string, actorAccountId: string, rows: RbinStagedRow[]): Promise<void>;
    finalize(batchId: string, actorAccountId: string): Promise<void>;
    getExportRows(batchId: string, actorAccountId: string): Promise<NamelistRowValues[] | null>;
    recordExport(batchId: string, actorAccountId: string, fileName: string, rowCount: number, buffer: Buffer): Promise<void>;
    private summarySelect;
    private getMappingAlerts;
    private mapSummary;
    private mapStoredRow;
}
