import type { AuthenticatedUser } from '../../auth/auth.types';
import type { AttritionFile } from '../attrition-import/attrition-import.types';
import { PsExitImportService } from './ps-exit-import.service';
export declare class PsExitImportController {
    private readonly service;
    constructor(service: PsExitImportService);
    upload(file: AttritionFile | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        warningRows: number;
        errorRows: number;
        minimumLwd: string;
        maximumLwd: string | null;
        retainedPeriod: string | null;
        periods: string[];
        period: string;
        carryoverDate: string | null;
        excludedMonthEndDate: string | null;
        carryoverRows: number;
        filteredRows: number;
        page: number;
        rows: import("./ps-exit-import.types").PsExitRow[];
    }>;
    preview(id: string, filter: string | undefined, period: string | undefined, page: string | undefined, actor: AuthenticatedUser): Promise<{
        id: string;
        fileName: string;
        totalRows: number;
        warningRows: number;
        errorRows: number;
        minimumLwd: string;
        maximumLwd: string | null;
        retainedPeriod: string | null;
        periods: string[];
        period: string;
        carryoverDate: string | null;
        excludedMonthEndDate: string | null;
        carryoverRows: number;
        filteredRows: number;
        page: number;
        rows: import("./ps-exit-import.types").PsExitRow[];
    }>;
    edit(id: string, row: string, values: unknown, actor: AuthenticatedUser): Promise<void>;
    deleteRow(id: string, row: string, actor: AuthenticatedUser): Promise<void>;
    cancel(id: string, actor: AuthenticatedUser): Promise<void>;
    commit(id: string, confirmed: unknown, period: unknown, actor: AuthenticatedUser): Promise<{
        importedRows: number;
        retainedRows: number;
        retainedPeriod: string;
        carryoverRows: number;
        insertedEvents: number;
        updatedEvents: number;
        matchedCandidates: number;
        pendingPsExit: number;
    }>;
}
