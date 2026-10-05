import type { AuthenticatedUser } from '../auth/auth.types';
import { SuccessionPlanningService } from './succession-planning.service';
export declare class SuccessionPlanningController {
    private readonly service;
    constructor(service: SuccessionPlanningService);
    getRegister(user: AuthenticatedUser): Promise<{
        revision: string;
        fileName: string | null;
        importedAt: string | null;
        rows: import("./succession-planning.service").SuccessionPlanningRecord[];
    }>;
}
