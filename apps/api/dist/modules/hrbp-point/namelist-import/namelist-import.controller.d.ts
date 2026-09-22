import type { AuthenticatedUser } from '../../auth/auth.types';
import { NamelistImportService } from './namelist-import.service';
import type { UploadedNamelistFile } from './namelist-import.types';
export declare class NamelistImportController {
    private readonly service;
    constructor(service: NamelistImportService);
    createPreview(file: UploadedNamelistFile | undefined, user: AuthenticatedUser): Promise<import("./namelist-import.types").NamelistPreviewSummary>;
    getRows(previewId: string, filter: string | undefined, page: string | undefined, pageSize: string | undefined, user: AuthenticatedUser): Promise<import("./namelist-import.types").NamelistPreviewPage>;
    updateRow(previewId: string, rowNumber: string, input: unknown, user: AuthenticatedUser): Promise<import("./namelist-import.types").NamelistPreviewSummary>;
    cancel(previewId: string, user: AuthenticatedUser): Promise<void>;
    commit(previewId: string, confirmReplacement: unknown, user: AuthenticatedUser): Promise<{
        totalRows: number;
    }>;
}
