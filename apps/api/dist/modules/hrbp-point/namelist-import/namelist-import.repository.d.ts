import { DatabaseService } from '../../../database/database.service';
import type { NamelistPreviewPage, NamelistPreviewSummary, ParsedNamelistRow, PreviewFilter, UploadedNamelistFile } from './namelist-import.types';
export declare class NamelistImportRepository {
    private readonly database;
    constructor(database: DatabaseService);
    createPreview(actorAccountId: string, file: UploadedNamelistFile, rows: ParsedNamelistRow[], reportingMonth: string): Promise<string>;
    createHistoricalPreview(actorAccountId: string, file: UploadedNamelistFile, rows: ParsedNamelistRow[], reportingMonth: string): Promise<string>;
    private createPreviewForMonth;
    getSummary(previewId: string, actorAccountId: string): Promise<NamelistPreviewSummary | null>;
    getRows(previewId: string, actorAccountId: string, filter: PreviewFilter, page: number, pageSize: number): Promise<NamelistPreviewPage | null>;
    getAllRows(previewId: string, actorAccountId: string): Promise<ParsedNamelistRow[] | null>;
    replaceRows(previewId: string, actorAccountId: string, rows: ParsedNamelistRow[]): Promise<void>;
    cancel(previewId: string, actorAccountId: string): Promise<boolean>;
    commit(previewId: string, actorAccountId: string, confirmReplacement: boolean): Promise<number>;
    commitHistorical(previewId: string, actorAccountId: string, confirmReplacement: boolean): Promise<number>;
    private getCurrentLiveImport;
    private copyLiveToMonthly;
    private enforceDetailedRetention;
    private archiveOverviewMonth;
    private buildSummary;
    private hasCurrentMonthImport;
    private hasHistoricalMonthImport;
}
