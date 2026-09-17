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
      SELECT JSONB_BUILD_OBJECT(
        'kpis', public.get_workforce_kpis(),
        'charts', public.get_workforce_charts()
      ) AS dashboard;
    `);

    const dashboard = result.rows[0]?.dashboard;
    return mapOverviewResponse(dashboard);
  }
}