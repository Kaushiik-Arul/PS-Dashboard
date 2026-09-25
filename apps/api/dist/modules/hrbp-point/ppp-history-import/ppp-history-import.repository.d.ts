import { DatabaseService } from '../../../database/database.service';
import type { ParsedPppImportRow, PppPreviewFilter, PppPreviewPage, PppPreviewSummary, UploadedPppFile } from './ppp-history-import.types';
export declare class PppHistoryImportRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getKnownPersNos(persNos: string[]): Promise<Set<string>>;
    createPreview(actorAccountId: string, file: UploadedPppFile, currentYear: number, rows: ParsedPppImportRow[]): Promise<string>;
    getSummary(previewId: string, actorAccountId: string): Promise<PppPreviewSummary | null>;
    getRows(previewId: string, actorAccountId: string, filter: PppPreviewFilter, page: number, pageSize: number): Promise<PppPreviewPage | null>;
    getAllRows(previewId: string, actorAccountId: string): Promise<ParsedPppImportRow[] | null>;
    replaceRows(previewId: string, actorAccountId: string, rows: ParsedPppImportRow[]): Promise<void>;
    cancel(previewId: string, actorAccountId: string): Promise<boolean>;
    commit(previewId: string, actorAccountId: string, confirmReplacement: boolean, serverYear: number): Promise<{
        employees: number;
        yearlyRows: number;
        skippedRows: number;
    }>;
    private countRows;
    private buildSummary;
    private hasExistingHistory;
}
