import type { AuthenticatedUser } from '../../auth/auth.types';
import { SuccessionPlanningImportService } from './succession-planning-import.service';
import type { SuccessionPlanningFile } from './succession-planning-import.types';
export declare class SuccessionPlanningImportController {
    private readonly service;
    constructor(service: SuccessionPlanningImportService);
    upload(file: SuccessionPlanningFile | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
    }>;
    preview(id: string, filter: string | undefined, page: string | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        warningRows: number;
        existingRows: number;
        filteredRows: number;
        page: number;
        rows: import("./succession-planning-import.types").SuccessionPlanningRow[];
        warningSummaries: {
            employeeNumber: string;
            employeeName: string;
            occurrences: number;
            assignments: {
                rowNumber: number;
                successor: 1 | 2;
                area: string;
                positionJdId: string;
                jdName: string;
                deptCode: string;
                currentJdId: string;
                readiness: string;
                rating: string;
                idpStatus: string;
            }[];
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
