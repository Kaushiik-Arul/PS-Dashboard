import type { AuthenticatedUser } from '../auth/auth.types';
import { DashboardPreferencesService, type OverviewPreferenceResponse } from './dashboard-preferences.service';
export declare class DashboardPreferencesController {
    private readonly service;
    constructor(service: DashboardPreferencesService);
    getOverview(user: AuthenticatedUser): Promise<OverviewPreferenceResponse>;
    saveOverview(body: unknown, user: AuthenticatedUser): Promise<OverviewPreferenceResponse>;
    resetOverview(user: AuthenticatedUser): Promise<OverviewPreferenceResponse>;
}
