import { StreamableFile } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { AttritionMovementsService } from './attrition-movements.service';
export declare class AttritionMovementsController {
    private readonly service;
    constructor(service: AttritionMovementsService);
    list(view?: string, search?: string, year?: string, month?: string, page?: string, pageSize?: string): Promise<import("./attrition-movements.types").AttritionMovementsPage>;
    exportConfirmedHistory(actor: AuthenticatedUser): Promise<StreamableFile>;
    dismissCandidate(candidateId: string, actor: AuthenticatedUser): Promise<void>;
}
