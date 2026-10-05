import { DatabaseService } from '../../database/database.service';
import type { SuccessionPlanningValues } from '../hrbp-point/succession-planning-import/succession-planning-import.types';
export type SuccessionPlanningRecord = SuccessionPlanningValues & {
    id: string;
};
export declare class SuccessionPlanningService {
    private readonly database;
    constructor(database: DatabaseService);
    getRegister(accountId: string): Promise<{
        revision: string;
        fileName: string | null;
        importedAt: string | null;
        rows: SuccessionPlanningRecord[];
    }>;
}
