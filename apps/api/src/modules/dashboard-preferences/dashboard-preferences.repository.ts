import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DashboardPreferencesRepository {
  constructor(private readonly database: DatabaseService) {}

  async getOverviewWidgetIds(accountId: string): Promise<string[] | null> {
    const result = await this.database.query<{ widget_ids: string[] }>(
      `SELECT widget_ids
       FROM public.account_dashboard_preferences
       WHERE account_id = $1::UUID AND dashboard_key = 'overview'`,
      [accountId],
    );
    return result.rows[0]?.widget_ids ?? null;
  }

  async saveOverviewWidgetIds(accountId: string, widgetIds: string[]): Promise<void> {
    await this.database.query(
      `INSERT INTO public.account_dashboard_preferences (
         account_id, dashboard_key, widget_ids
       ) VALUES ($1::UUID, 'overview', $2::TEXT[])
       ON CONFLICT (account_id, dashboard_key) DO UPDATE
       SET widget_ids = EXCLUDED.widget_ids,
           updated_at = CURRENT_TIMESTAMP`,
      [accountId, widgetIds],
    );
  }

  async resetOverview(accountId: string): Promise<void> {
    await this.database.query(
      `DELETE FROM public.account_dashboard_preferences
       WHERE account_id = $1::UUID AND dashboard_key = 'overview'`,
      [accountId],
    );
  }
}
