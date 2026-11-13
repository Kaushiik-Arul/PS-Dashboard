import { AttritionMovementsRepository } from './attrition-movements.repository';
import { type ConfirmedAttritionExport, type AttritionMovementsPage } from './attrition-movements.types';
export declare class AttritionMovementsService {
    private readonly repository;
    private readonly logger;
    constructor(repository: AttritionMovementsRepository);
    exportConfirmedHistory(actorAccountId: string): Promise<ConfirmedAttritionExport>;
    list(viewInput?: string, searchInput?: string, yearInput?: string, monthInput?: string, pageInput?: string, pageSizeInput?: string): Promise<AttritionMovementsPage>;
    dismissCandidate(candidateId: string, actor: string): Promise<void>;
    private addSummarySheet;
    private addMovementsSheet;
    private optionalInteger;
    private positiveInteger;
    private run;
}
