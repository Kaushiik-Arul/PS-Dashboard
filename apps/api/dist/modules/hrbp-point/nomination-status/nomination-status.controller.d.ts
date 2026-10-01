import type { AuthenticatedUser } from '../../auth/auth.types';
import { NominationStatusService } from './nomination-status.service';
import type { NominationStatusFile } from './nomination-status.types';
export declare class NominationStatusController {
    private readonly service;
    constructor(service: NominationStatusService);
    upload(file: NominationStatusFile | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
    }>;
    preview(id: string, filter: string | undefined, page: string | undefined, actor: AuthenticatedUser): Promise<{
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
            values: import("./nomination-status.types").NominationStatusValues;
            issues: import("./nomination-status.types").NominationStatusIssue[];
        }[];
    }>;
    editPreview(id: string, row: string, values: unknown, actor: AuthenticatedUser): Promise<void>;
    deletePreviewRow(id: string, row: string, actor: AuthenticatedUser): Promise<void>;
    cancel(id: string, actor: AuthenticatedUser): Promise<void>;
    commit(id: string, confirmed: unknown, actor: AuthenticatedUser): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
