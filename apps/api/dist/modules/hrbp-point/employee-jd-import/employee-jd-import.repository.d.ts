import { DatabaseService } from '../../../database/database.service';
import type { EmployeeJdPreviewFilter, EmployeeJdPreviewPage, EmployeeJdPreviewSummary, ParsedEmployeeJdRow, UploadedEmployeeJdFile } from './employee-jd-import.types';
export declare class EmployeeJdImportRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getKnownPersNos(persNos: string[]): Promise<Set<string>>;
    getKnownJdIds(jdIds: string[]): Promise<Map<string, string>>;
    createPreview(actorAccountId: string, reportingMonth: string, file: UploadedEmployeeJdFile, rows: ParsedEmployeeJdRow[]): Promise<string>;
    getSummary(previewId: string, actorAccountId: string): Promise<EmployeeJdPreviewSummary | null>;
    getRows(previewId: string, actorAccountId: string, filter: EmployeeJdPreviewFilter, page: number, pageSize: number): Promise<EmployeeJdPreviewPage | null>;
    getAllRows(previewId: string, actorAccountId: string): Promise<ParsedEmployeeJdRow[] | null>;
    replaceRows(previewId: string, actorAccountId: string, rows: ParsedEmployeeJdRow[]): Promise<void>;
    deleteRow(previewId: string, actorAccountId: string, rowNumber: number): Promise<boolean>;
    cancel(previewId: string, actorAccountId: string): Promise<boolean>;
    commit(previewId: string, actorAccountId: string, confirmReplacement: boolean): Promise<{
        totalRows: number;
        movements: number;
    }>;
    private buildSummary;
    private hasExistingAssignments;
}
