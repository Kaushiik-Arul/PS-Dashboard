import { DatabaseService } from '../../database/database.service';
export declare class DashboardPreferencesRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getOverviewWidgetIds(accountId: string): Promise<string[] | null>;
    saveOverviewWidgetIds(accountId: string, widgetIds: string[]): Promise<void>;
    resetOverview(accountId: string): Promise<void>;
}
