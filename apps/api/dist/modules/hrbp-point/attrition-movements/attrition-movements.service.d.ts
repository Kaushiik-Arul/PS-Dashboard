import { AttritionMovementsRepository } from './attrition-movements.repository';
import { type AttritionMovementsPage } from './attrition-movements.types';
export declare class AttritionMovementsService {
    private readonly repository;
    private readonly logger;
    constructor(repository: AttritionMovementsRepository);
    list(viewInput?: string, searchInput?: string, yearInput?: string, monthInput?: string, pageInput?: string, pageSizeInput?: string): Promise<AttritionMovementsPage>;
    dismissCandidate(candidateId: string, actor: string): Promise<void>;
    private optionalInteger;
    private positiveInteger;
    private run;
}
