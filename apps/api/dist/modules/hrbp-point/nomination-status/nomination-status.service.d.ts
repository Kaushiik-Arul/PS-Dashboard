import { DatabaseService } from '../../../database/database.service';
import { type NominationStatusFile, type NominationStatusValues } from './nomination-status.types';
export declare class NominationStatusService {
    private readonly database;
    constructor(database: DatabaseService);
    private uuid;
    private lockState;
    upload(actor: string, file?: NominationStatusFile): Promise<{
        id: string;
    }>;
    private previewLock;
    private validatedRows;
    preview(actor: string, id: string, filter?: string, pageInput?: string): Promise<{
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
            values: NominationStatusValues;
            issues: import("./nomination-status.types").NominationStatusIssue[];
        }[];
    }>;
    editPreview(actor: string, id: string, rowInput: string, input?: unknown): Promise<void>;
    cancel(actor: string, id: string): Promise<void>;
    commit(actor: string, id: string, confirmed: unknown): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
