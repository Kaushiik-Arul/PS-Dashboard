import type { AuthenticatedUser } from '../../auth/auth.types';
import { PoolRegisterService } from './pool-register.service';
import type { PoolFile } from './pool-register.types';
export declare class PoolRegisterController {
    private readonly service;
    constructor(service: PoolRegisterService);
    list(kind: string, actor: AuthenticatedUser): Promise<(import("./pool-register.types").PoolValues & {
        id: string;
    })[]>;
    lookup(kind: string, persNo: string): Promise<{
        employee: import("./pool-register.types").PoolValues | null;
    }>;
    add(kind: string, values: unknown, actor: AuthenticatedUser): Promise<{
        id: string;
        issues: import("./pool-register.types").PoolIssue[];
    }>;
    update(kind: string, id: string, values: unknown, actor: AuthenticatedUser): Promise<{
        id: string;
        issues: import("./pool-register.types").PoolIssue[];
    }>;
    remove(kind: string, id: string): Promise<void>;
    upload(kind: string, file: PoolFile | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
    }>;
    preview(kind: string, id: string, filter: string | undefined, page: string | undefined, actor: AuthenticatedUser): Promise<{
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
    editPreview(kind: string, id: string, row: string, values: unknown, actor: AuthenticatedUser): Promise<void>;
    deletePreviewRow(kind: string, id: string, row: string, actor: AuthenticatedUser): Promise<void>;
    cancel(kind: string, id: string, actor: AuthenticatedUser): Promise<void>;
    commit(kind: string, id: string, confirmed: unknown, actor: AuthenticatedUser): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
