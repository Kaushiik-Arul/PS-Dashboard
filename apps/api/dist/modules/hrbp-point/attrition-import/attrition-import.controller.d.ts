import type { AuthenticatedUser } from '../../auth/auth.types';
import { AttritionImportService } from './attrition-import.service';
import type { AttritionFile } from './attrition-import.types';
export declare class AttritionImportController {
    private readonly service;
    constructor(service: AttritionImportService);
    upload(file: AttritionFile | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
    }>;
    preview(id: string, filter: string | undefined, page: string | undefined, actor: AuthenticatedUser): Promise<{
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
    editPreview(id: string, row: string, values: unknown, actor: AuthenticatedUser): Promise<void>;
    deletePreviewRow(id: string, row: string, actor: AuthenticatedUser): Promise<void>;
    cancel(id: string, actor: AuthenticatedUser): Promise<void>;
    commit(id: string, confirmed: unknown, actor: AuthenticatedUser): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
