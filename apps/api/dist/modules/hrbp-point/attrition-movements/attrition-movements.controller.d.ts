import type { AuthenticatedUser } from '../../auth/auth.types';
import { AttritionMovementsService } from './attrition-movements.service';
export declare class AttritionMovementsController {
    private readonly service;
    constructor(service: AttritionMovementsService);
    list(view?: string, search?: string, year?: string, month?: string, page?: string, pageSize?: string): Promise<import("./attrition-movements.types").AttritionMovementsPage>;
    dismissCandidate(candidateId: string, actor: AuthenticatedUser): Promise<void>;
}
