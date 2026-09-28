import type { AuthenticatedUser } from '../../auth/auth.types';
import { EmployeeJdImportService } from './employee-jd-import.service';
import type { UploadedEmployeeJdFile } from './employee-jd-import.types';
export declare class EmployeeJdImportController {
    private readonly service;
    constructor(service: EmployeeJdImportService);
    createPreview(file: UploadedEmployeeJdFile | undefined, user: AuthenticatedUser): Promise<import("./employee-jd-import.types").EmployeeJdPreviewSummary>;
    getRows(previewId: string, filter: string | undefined, page: string | undefined, pageSize: string | undefined, user: AuthenticatedUser): Promise<import("./employee-jd-import.types").EmployeeJdPreviewPage>;
    updateRow(previewId: string, rowNumber: string, input: unknown, user: AuthenticatedUser): Promise<import("./employee-jd-import.types").EmployeeJdPreviewSummary>;
    deleteRow(previewId: string, rowNumber: string, user: AuthenticatedUser): Promise<void>;
    cancel(previewId: string, user: AuthenticatedUser): Promise<void>;
    commit(previewId: string, confirmReplacement: unknown, user: AuthenticatedUser): Promise<{
        totalRows: number;
        movements: number;
    }>;
}
