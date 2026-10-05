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

  async getAvailableMonths(): Promise<{ currentMonth: string | null; detailedMonths: string[] }> {
    const result = await this.database.query<{ current_month: string | null; detailed_months: string[] }>(`
      SELECT
        (
          SELECT TO_CHAR(imports.reporting_month, 'YYYY-MM')
          FROM public.namelist_imports imports
          WHERE imports.reporting_month_confirmed
            AND imports.import_mode = 'live' AND imports.status = 'completed'
          ORDER BY imports.reporting_month DESC, imports.imported_at DESC, imports.id DESC
          LIMIT 1
        ) AS current_month,
        COALESCE((
          SELECT ARRAY_AGG(months.reporting_month ORDER BY months.reporting_month DESC)
          FROM (
            SELECT DISTINCT TO_CHAR(history.reporting_month, 'YYYY-MM') AS reporting_month
            FROM public.employee_namelist_monthly history
          ) months
        ), ARRAY[]::text[]) AS detailed_months
    `);
    return {
      currentMonth: result.rows[0]?.current_month ?? null,
      detailedMonths: result.rows[0]?.detailed_months ?? [],
    };
  }

  async getArchivedMonths(): Promise<string[]> {
    const result = await this.database.query<{ reporting_month: string }>(`
      SELECT TO_CHAR(reporting_month, 'YYYY-MM') AS reporting_month
      FROM public.dashboard_json_snapshots
      WHERE dashboard_key = 'overview' AND is_active
      ORDER BY reporting_month DESC
    `);
    return result.rows.map((row) => row.reporting_month);
  }

  async getArchivedOverview(reportingMonth: string): Promise<OverviewResponseDto | null> {
    const result = await this.database.query<OverviewRow>(
      `SELECT payload AS dashboard
       FROM public.dashboard_json_snapshots
       WHERE dashboard_key = 'overview' AND reporting_month = $1::date AND is_active`,
      [reportingMonth],
    );
    return result.rows[0] ? mapOverviewResponse(result.rows[0].dashboard) : null;
  }

  async getOverview(
    filters: NormalizedOverviewFilters,
    accountId: string,
  ): Promise<OverviewResponseDto> {
    const result = await this.database.query<OverviewRow>(`
      WITH settings AS (
        SELECT
          CASE
            WHEN $8::DATE IS NOT NULL THEN ($8::DATE + INTERVAL '1 month - 1 day')::DATE
            ELSE COALESCE((
              SELECT (imports.reporting_month + INTERVAL '1 month - 1 day')::DATE
              FROM public.namelist_imports imports
              WHERE imports.reporting_month_confirmed
                AND imports.import_mode = 'live'
                AND imports.status = 'completed'
              ORDER BY imports.reporting_month DESC, imports.imported_at DESC, imports.id DESC
              LIMIT 1
            ), CURRENT_DATE)
          END AS as_of_date,
          $8::DATE AS reporting_month
      ),
      namelist_source AS (
        SELECT
          e.function, e.organizational_unit, e.range, e.location,
          e.gender_key, e.direct_or_indirect
        FROM public.employee_namelist e
        WHERE $8::DATE IS NULL

        UNION ALL

        SELECT
          e.function, e.organizational_unit, e.range, e.location,
          e.gender_key, e.direct_or_indirect
        FROM public.employee_namelist_monthly e
        WHERE $8::DATE IS NOT NULL
          AND e.reporting_month = $8::DATE
      ),
      filter_employees AS (
        SELECT
          NULLIF(BTRIM(e.function), '') AS function_name,
          NULLIF(BTRIM(e.organizational_unit), '') AS org_unit,
          NULLIF(BTRIM(e.range), '') AS range_name,
          NULLIF(BTRIM(e.location), '') AS location_name,
          NULLIF(BTRIM(e.gender_key), '') AS gender_name,
          NULLIF(BTRIM(e.direct_or_indirect), '') AS direct_or_indirect
        FROM namelist_source e
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
          settings.as_of_date, $1, $2, $3, $4, $5, $6, $7::UUID,
          settings.reporting_month
        ),
        'charts', public.get_workforce_charts(
          settings.as_of_date, $1, $2, $3, $4, $5, $6, $7::UUID,
          settings.reporting_month
        ),
        'reportingMonth', TO_CHAR(settings.reporting_month, 'YYYY-MM'),
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
      filters.reportingMonth,
    ]);

    const dashboard = result.rows[0]?.dashboard;
    return mapOverviewResponse(dashboard);
  }
}