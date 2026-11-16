import { DatabaseService } from '../../../database/database.service';
import type { AttritionMovementsPage, AttritionMovementView, ConfirmPendingCandidateInput, ConfirmPendingCandidateResult, ConfirmedAttritionExportRow, PendingAttritionCandidate } from './attrition-movements.types';
export declare class AttritionMovementsRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getPendingCandidate(candidateId: string): Promise<PendingAttritionCandidate | null>;
    confirmPendingCandidate(candidateId: string, input: ConfirmPendingCandidateInput, actor: string): Promise<ConfirmPendingCandidateResult>;
    getConfirmedExportRows(): Promise<ConfirmedAttritionExportRow[]>;
    recordExport(actorAccountId: string, rowCount: number, fileName: string, fileHash: string): Promise<void>;
    dismissCandidate(candidateId: string, actor: string): Promise<boolean>;
    list(view: AttritionMovementView, search: string, year: number | null, month: number | null, page: number, pageSize: number): Promise<AttritionMovementsPage>;
    private mapCandidate;
}
