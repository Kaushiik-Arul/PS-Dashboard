import type { AuthenticatedUser } from '../../auth/auth.types';
import { PppHistoryImportService } from './ppp-history-import.service';
import type { UploadedPppFile } from './ppp-history-import.types';
export declare class PppHistoryImportController {
    private readonly service;
    constructor(service: PppHistoryImportService);
    createPreview(file: UploadedPppFile | undefined, user: AuthenticatedUser): Promise<import("./ppp-history-import.types").PppPreviewSummary>;
    getRows(previewId: string, filter: string | undefined, page: string | undefined, pageSize: string | undefined, user: AuthenticatedUser): Promise<import("./ppp-history-import.types").PppPreviewPage>;
    updateRow(previewId: string, rowNumber: string, input: unknown, user: AuthenticatedUser): Promise<import("./ppp-history-import.types").PppPreviewSummary>;
    cancel(previewId: string, user: AuthenticatedUser): Promise<void>;
    commit(previewId: string, confirmReplacement: unknown, user: AuthenticatedUser): Promise<{
        employees: number;
        yearlyRows: number;
        skippedRows: number;
    }>;
}
