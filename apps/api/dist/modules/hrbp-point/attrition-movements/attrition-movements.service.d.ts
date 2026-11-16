import { AttritionMovementsRepository } from './attrition-movements.repository';
import { type ConfirmedAttritionExport, type AttritionMovementsPage, type PendingAttritionCandidate } from './attrition-movements.types';
export declare class AttritionMovementsService {
    private readonly repository;
    private readonly logger;
    constructor(repository: AttritionMovementsRepository);
    exportConfirmedHistory(actorAccountId: string): Promise<ConfirmedAttritionExport>;
    list(viewInput?: string, searchInput?: string, yearInput?: string, monthInput?: string, pageInput?: string, pageSizeInput?: string): Promise<AttritionMovementsPage>;
    dismissCandidate(candidateId: string, actor: string): Promise<void>;
    getPendingCandidate(candidateId: string): Promise<PendingAttritionCandidate>;
    confirmPendingCandidate(candidateId: string, body: unknown, actor: string): Promise<{
        eventId: string;
    }>;
    private addSummarySheet;
    private addMovementsSheet;
    private optionalInteger;
    private positiveInteger;
    private candidateId;
    private confirmationInput;
    private run;
}
