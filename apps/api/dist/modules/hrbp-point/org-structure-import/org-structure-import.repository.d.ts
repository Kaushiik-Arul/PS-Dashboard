import { DatabaseService } from '../../../database/database.service';
import type { OrgStructureFile, OrgStructurePreviewRow, OrgStructureValues } from './org-structure-import.types';
export declare class OrgStructureImportRepository {
    private readonly database;
    constructor(database: DatabaseService);
    createPreview(file: OrgStructureFile, rows: OrgStructurePreviewRow[], actor: string): Promise<{
        id: string;
    }>;
    getPreview(id: string, actor: string, page: number): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        existingRows: number;
        filteredRows: number;
        page: number;
        rows: {
            rowNumber: number;
            values: OrgStructureValues;
        }[];
    }>;
    updateRow(id: string, actor: string, rowNumber: number, values: OrgStructureValues): Promise<void>;
    deleteRow(id: string, actor: string, rowNumber: number): Promise<void>;
    cancel(id: string, actor: string): Promise<boolean>;
    commit(id: string, actor: string, confirmed: boolean): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
    list(): Promise<{
        id: string;
        sourceRowNumber: number;
        roleTitle: string;
        reportingTo: string;
        jdId: string;
        careerLevel: string;
        layer: string;
        grade: string;
        function: string;
        orderBy: number | null;
        isActive: boolean;
        importedAt: string;
    }[]>;
    private lockPreview;
}
