import type { AuthenticatedUser } from '../../auth/auth.types';
import { AvailableTalentService } from './available-talent.service';
import type { AvailableFile } from './available-talent.types';
export declare class AvailableTalentController {
    private readonly service;
    constructor(service: AvailableTalentService);
    list(actor: AuthenticatedUser): Promise<(import("./available-talent.types").AvailableValues & {
        id: string;
    })[]>;
    lookup(persNo: string): Promise<{
        employee: import("./available-talent.types").AvailableValues | null;
    }>;
    add(values: unknown, actor: AuthenticatedUser): Promise<{
        id: string;
        issues: import("./available-talent.types").AvailableIssue[];
    }>;
    update(id: string, values: unknown, actor: AuthenticatedUser): Promise<{
        id: string;
        issues: import("./available-talent.types").AvailableIssue[];
    }>;
    remove(id: string): Promise<void>;
    upload(file: AvailableFile | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
    }>;
    preview(id: string, filter: string | undefined, page: string | undefined, actor: AuthenticatedUser): Promise<{
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
    editPreview(id: string, row: string, values: unknown, actor: AuthenticatedUser): Promise<void>;
    deletePreviewRow(id: string, row: string, actor: AuthenticatedUser): Promise<void>;
    cancel(id: string, actor: AuthenticatedUser): Promise<void>;
    commit(id: string, confirmed: unknown, actor: AuthenticatedUser): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
