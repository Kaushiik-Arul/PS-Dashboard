import type { AuthenticatedUser } from '../../auth/auth.types';
import { OrgStructureImportService } from './org-structure-import.service';
import type { OrgStructureFile } from './org-structure-import.types';
export declare class OrgStructureImportController {
    private readonly service;
    constructor(service: OrgStructureImportService);
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
    createPreview(file: OrgStructureFile | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
    }>;
    getRows(id: string, page: string | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        existingRows: number;
        filteredRows: number;
        page: number;
        rows: {
            rowNumber: number;
            values: import("./org-structure-import.types").OrgStructureValues;
        }[];
    }>;
    updateRow(id: string, rowNumber: string, values: unknown, actor: AuthenticatedUser): Promise<void>;
    deleteRow(id: string, rowNumber: string, actor: AuthenticatedUser): Promise<void>;
    cancel(id: string, actor: AuthenticatedUser): Promise<void>;
    commit(id: string, confirmation: unknown, actor: AuthenticatedUser): Promise<{
        importedRows: number;
        replacedRows: number;
    }>;
}
