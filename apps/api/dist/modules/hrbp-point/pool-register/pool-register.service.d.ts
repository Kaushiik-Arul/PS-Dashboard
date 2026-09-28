import { DatabaseService } from '../../../database/database.service';
import { type PoolFile, type PoolKind, type PoolValues } from './pool-register.types';
export declare class PoolRegisterService {
    private readonly database;
    constructor(database: DatabaseService);
    kind(value: string): PoolKind;
    private uuid;
    private employees;
    lookup(persNo: string): Promise<{
        employee: PoolValues | null;
    }>;
    list(kind: PoolKind, actor: string): Promise<(PoolValues & {
        id: string;
    })[]>;
    private lockState;
    private bump;
    save(kind: PoolKind, actor: string, input: unknown, id?: string): Promise<{
        id: string;
        issues: import("./pool-register.types").PoolIssue[];
    }>;
    remove(kind: PoolKind, id: string): Promise<void>;
    upload(kind: PoolKind, actor: string, file?: PoolFile): Promise<{
        id: string;
    }>;
    private previewLock;
    private validatedRows;
    preview(kind: PoolKind, actor: string, id: string, filter?: string, pageInput?: string): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        validRows: number;
        warningRows: number;
        invalidRows: number;
        existingRows: number;
        filteredRows: number;
        page: number;
        rows: import("./pool-register.types").PoolRow[];
    }>;
    editPreview(kind: PoolKind, actor: string, id: string, rowInput: string, input?: unknown): Promise<void>;
    cancel(kind: PoolKind, actor: string, id: string): Promise<void>;
    commit(kind: PoolKind, actor: string, id: string, confirmed: unknown): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
