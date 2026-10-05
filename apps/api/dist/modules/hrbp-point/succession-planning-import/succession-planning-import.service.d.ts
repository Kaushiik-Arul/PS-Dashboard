import { DatabaseService } from '../../../database/database.service';
import { type SuccessionPlanningFile } from './succession-planning-import.types';
export declare class SuccessionPlanningImportService {
    private readonly database;
    constructor(database: DatabaseService);
    private uuid;
    private jdLookup;
    private lockState;
    private previewLock;
    private validatedRows;
    upload(actor: string, file?: SuccessionPlanningFile): Promise<{
        id: string;
    }>;
    preview(actor: string, id: string, filter?: string, pageInput?: string): Promise<{
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
            assignments: Array<{
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
            }>;
        }[];
    }>;
    editPreview(actor: string, id: string, rowInput: string, input?: unknown): Promise<void>;
    cancel(actor: string, id: string): Promise<void>;
    commit(actor: string, id: string, confirmed: unknown): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
