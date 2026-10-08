import { DashboardPreferencesRepository } from './dashboard-preferences.repository';
export type OverviewPreferenceResponse = {
    widgetIds: string[];
    isDefault: boolean;
};
export declare class DashboardPreferencesService {
    private readonly repository;
    private readonly logger;
    constructor(repository: DashboardPreferencesRepository);
    getOverview(accountId: string): Promise<OverviewPreferenceResponse>;
    saveOverview(accountId: string, body: unknown): Promise<OverviewPreferenceResponse>;
    resetOverview(accountId: string): Promise<OverviewPreferenceResponse>;
    private parseWidgetIds;
    private logError;
}
