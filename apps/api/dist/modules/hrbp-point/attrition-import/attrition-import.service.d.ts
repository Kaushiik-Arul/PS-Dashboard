import { DatabaseService } from '../../../database/database.service';
import type { AttritionFile } from './attrition-import.types';
export declare class AttritionImportService {
    private readonly database;
    constructor(database: DatabaseService);
    private uuid;
    private rangeMappings;
    private lockState;
    private previewLock;
    private validatedRows;
    upload(actor: string, file?: AttritionFile): Promise<{
        id: string;
    }>;
    preview(actor: string, id: string, filter?: string, pageInput?: string): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        warningRows: number;
        errorRows: number;
        existingRows: number;
        filteredRows: number;
        page: number;
        rows: import("./attrition-import.types").AttritionRow[];
    }>;
    editPreview(actor: string, id: string, rowInput: string, input?: unknown): Promise<void>;
    cancel(actor: string, id: string): Promise<void>;
    commit(actor: string, id: string, confirmed: unknown): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
