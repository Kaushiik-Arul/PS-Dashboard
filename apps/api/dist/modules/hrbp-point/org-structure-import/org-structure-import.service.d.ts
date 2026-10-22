import { OrgStructureImportRepository } from './org-structure-import.repository';
import { type OrgStructureFile, type OrgStructureValues } from './org-structure-import.types';
export declare class OrgStructureImportService {
    private readonly repository;
    private readonly logger;
    constructor(repository: OrgStructureImportRepository);
    createPreview(file: OrgStructureFile | undefined, actor: string): Promise<{
        id: string;
    }>;
    getRows(id: string, actor: string, page?: string): Promise<{
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
    updateRow(id: string, rowInput: string, input: unknown, actor: string): Promise<void>;
    deleteRow(id: string, rowInput: string, actor: string): Promise<void>;
    cancel(id: string, actor: string): Promise<void>;
    commit(id: string, confirmation: unknown, actor: string): Promise<{
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
    private validateId;
    private validateRowNumber;
    private validateValues;
    private run;
}
