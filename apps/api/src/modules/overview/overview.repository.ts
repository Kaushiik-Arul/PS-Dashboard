import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { NormalizedOverviewFilters } from './dto/overview-filter.dto';
import { OverviewResponseDto } from './dto/overview-response.dto';
import { mapOverviewResponse } from './overview.mapper';

type OverviewRow = {
  dashboard: unknown;
};

@Injectable()
export class OverviewRepository {
  constructor(private readonly database: DatabaseService) {}

  async getOverview(
    filters: NormalizedOverviewFilters,
    accountId: string,
  ): Promise<OverviewResponseDto> {
    const result = await this.database.query<OverviewRow>(`
      WITH settings AS (
        SELECT CURRENT_DATE AS as_of_date
      ),
      filter_employees AS (
        SELECT
          NULLIF(BTRIM(e.function), '') AS function_name,
          NULLIF(BTRIM(e.organizational_unit), '') AS org_unit,
          NULLIF(BTRIM(e.range), '') AS range_name,
          NULLIF(BTRIM(e.location), '') AS location_name,
          NULLIF(BTRIM(e.gender_key), '') AS gender_name,
          NULLIF(BTRIM(e.direct_or_indirect), '') AS direct_or_indirect
        FROM public.employee_namelist e
        WHERE EXISTS (
          SELECT 1
          FROM public.master_access access
          WHERE access.account_id = $7::UUID
            AND (
              access.role IN ('hrbp', 'admin')
              OR (access.role = 'range_head'
                AND BTRIM(e.range) = BTRIM(access.assigned_range))
              OR (access.role IN ('department_head', 'sub_department_head')
                AND BTRIM(e.range) = BTRIM(access.assigned_range)
                AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit))
            )
        )
      )
      SELECT JSONB_BUILD_OBJECT(
        'kpis', public.get_workforce_kpis(
          settings.as_of_date, $1, $2, $3, $4, $5, $6, $7::UUID
        ),
        'charts', public.get_workforce_charts(
          settings.as_of_date, $1, $2, $3, $4, $5, $6, $7::UUID
        ),
        'filterOptions', JSONB_BUILD_OBJECT(
          'functionName', TO_JSONB(ARRAY(
            SELECT DISTINCT e.function_name
            FROM filter_employees e
            WHERE e.function_name IS NOT NULL
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.function_name
          )),
          'orgUnit', TO_JSONB(ARRAY(
            SELECT DISTINCT e.org_unit
            FROM filter_employees e
            WHERE e.org_unit IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.org_unit
          )),
          'range', TO_JSONB(ARRAY(
            SELECT DISTINCT e.range_name
            FROM filter_employees e
            WHERE e.range_name IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.range_name
          )),
          'location', TO_JSONB(ARRAY(
            SELECT DISTINCT e.location_name
            FROM filter_employees e
            WHERE e.location_name IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.location_name
          )),
          'gender', TO_JSONB(ARRAY(
            SELECT DISTINCT e.gender_name
            FROM filter_employees e
            WHERE e.gender_name IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.gender_name
          )),
          'directOrIndirect', TO_JSONB(ARRAY(
            SELECT DISTINCT e.direct_or_indirect
            FROM filter_employees e
            WHERE e.direct_or_indirect IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
            ORDER BY e.direct_or_indirect
          ))
        )
      ) AS dashboard
      FROM settings;
    `, [
      filters.functionName,
      filters.orgUnit,
      filters.range,
      filters.location,
      filters.gender,
      filters.directOrIndirect,
      accountId,
    ]);

    const dashboard = result.rows[0]?.dashboard;
    return mapOverviewResponse(dashboard);
  }
}