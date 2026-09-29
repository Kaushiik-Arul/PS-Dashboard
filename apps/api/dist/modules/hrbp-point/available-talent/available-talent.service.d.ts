import { DatabaseService } from '../../../database/database.service';
import { type AvailableFile, type AvailableKind, type AvailableValues } from './available-talent.types';
export declare class AvailableTalentService {
    private readonly database;
    constructor(database: DatabaseService);
    private uuid;
    private employees;
    private knownJds;
    lookup(persNo: string): Promise<{
        employee: AvailableValues | null;
    }>;
    list(kind: AvailableKind, actor: string): Promise<(AvailableValues & {
        id: string;
    })[]>;
    private lockState;
    private bump;
    save(kind: AvailableKind, actor: string, input: unknown, id?: string): Promise<{
        id: string;
        issues: import("./available-talent.types").AvailableIssue[];
    }>;
    remove(kind: AvailableKind, id: string): Promise<void>;
    upload(kind: AvailableKind, actor: string, file?: AvailableFile): Promise<{
        id: string;
    }>;
    private previewLock;
    private validatedRows;
    preview(kind: AvailableKind, actor: string, id: string, filter?: string, pageInput?: string): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        validRows: number;
        warningRows: number;
        invalidRows: number;
        existingRows: number;
        filteredRows: number;
        page: number;
        rows: import("./available-talent.types").AvailableRow[];
    }>;
    editPreview(kind: AvailableKind, actor: string, id: string, rowInput: string, input?: unknown): Promise<void>;
    cancel(kind: AvailableKind, actor: string, id: string): Promise<void>;
    commit(kind: AvailableKind, actor: string, id: string, confirmed: unknown): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
