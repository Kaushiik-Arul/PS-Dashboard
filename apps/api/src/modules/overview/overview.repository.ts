import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { OverviewResponseDto } from './dto/overview-response.dto';
import { mapOverviewResponse } from './overview.mapper';

type OverviewRow = {
  dashboard: unknown;
};

@Injectable()
export class OverviewRepository {
  constructor(private readonly database: DatabaseService) {}

  async getOverview(): Promise<OverviewResponseDto> {
    const result = await this.database.query<OverviewRow>(`
      WITH settings AS (
        SELECT CURRENT_DATE AS as_of_date
      )
      SELECT JSONB_BUILD_OBJECT(
        'kpis', public.get_workforce_kpis(settings.as_of_date),
        'charts', public.get_workforce_charts(settings.as_of_date)
      ) AS dashboard
      FROM settings;
    `);

    const dashboard = result.rows[0]?.dashboard;
    return mapOverviewResponse(dashboard);
  }
}