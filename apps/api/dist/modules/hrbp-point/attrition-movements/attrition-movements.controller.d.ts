import { StreamableFile } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { AttritionMovementsService } from './attrition-movements.service';
export declare class AttritionMovementsController {
    private readonly service;
    constructor(service: AttritionMovementsService);
    list(view?: string, search?: string, year?: string, month?: string, page?: string, pageSize?: string): Promise<import("./attrition-movements.types").AttritionMovementsPage>;
    exportConfirmedHistory(actor: AuthenticatedUser): Promise<StreamableFile>;
    getPendingCandidate(candidateId: string): Promise<import("./attrition-movements.types").PendingAttritionCandidate>;
    confirmPendingCandidate(candidateId: string, body: unknown, actor: AuthenticatedUser): Promise<{
        eventId: string;
    }>;
    dismissCandidate(candidateId: string, actor: AuthenticatedUser): Promise<void>;
}
