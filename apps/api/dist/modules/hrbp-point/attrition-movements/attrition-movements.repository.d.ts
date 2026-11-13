import { DatabaseService } from '../../../database/database.service';
import type { AttritionMovementsPage, AttritionMovementView } from './attrition-movements.types';
export declare class AttritionMovementsRepository {
    private readonly database;
    constructor(database: DatabaseService);
    dismissCandidate(candidateId: string, actor: string): Promise<boolean>;
    list(view: AttritionMovementView, search: string, year: number | null, month: number | null, page: number, pageSize: number): Promise<AttritionMovementsPage>;
}
