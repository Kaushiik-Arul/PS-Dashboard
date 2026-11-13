import type { PoolClient } from 'pg';
import type { ParsedRbinRow, RbinSourceValues } from './rbin-cleaning.types';
export type RbinAttritionTrackingContext = {
    actorAccountId: string;
    reportingMonth: string;
    previousImportId: string | null;
    previousBatchId: string | null;
    currentImportId: string;
    currentBatchId: string;
    previousRawRows: readonly {
        values: RbinSourceValues;
    }[];
    currentRawRows: readonly ParsedRbinRow[];
};
export declare class RbinAttritionRepository {
    track(client: PoolClient, context: RbinAttritionTrackingContext): Promise<void>;
    private getCleanedRows;
}
