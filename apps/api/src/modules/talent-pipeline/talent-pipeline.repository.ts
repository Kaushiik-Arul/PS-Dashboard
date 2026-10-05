import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { NormalizedTalentPipelineFilters } from './dto/talent-pipeline-filter.dto';
import { TalentPipelineResponseDto } from './dto/talent-pipeline-response.dto';
import { mapTalentPipelineResponse } from './talent-pipeline.mapper';

@Injectable()
export class TalentPipelineRepository {
  constructor(private readonly database: DatabaseService) {}

  async getTalentPipeline(
    filters: NormalizedTalentPipelineFilters,
    accountId: string,
  ): Promise<TalentPipelineResponseDto> {
    return mapTalentPipelineResponse(
      await this.queryDashboard(filters, accountId, null),
    );
  }

  async getHistoryState(): Promise<{ snapshotMonths: string[] }> {
    const result = await this.database.query<{ snapshot_months: string[] }>(`
      SELECT COALESCE((
        SELECT ARRAY_AGG(TO_CHAR(reporting_month, 'YYYY-MM') ORDER BY reporting_month DESC)
        FROM public.dashboard_json_snapshots
        WHERE dashboard_key = 'talent-pipeline' AND is_active
      ), ARRAY[]::text[]) AS snapshot_months
    `);
    return {
      snapshotMonths: result.rows[0]?.snapshot_months ?? [],
    };
  }

  async getSnapshot(reportingMonth: string): Promise<TalentPipelineResponseDto | null> {
    const result = await this.database.query<{ dashboard: unknown }>(
      `SELECT payload AS dashboard
       FROM public.dashboard_json_snapshots
       WHERE dashboard_key = 'talent-pipeline'
         AND reporting_month = $1::date AND is_active`,
      [reportingMonth],
    );
    return result.rows[0]
      ? mapTalentPipelineResponse(result.rows[0].dashboard)
      : null;
  }

  async publishSnapshot(accountId: string, reportingMonth: string): Promise<string> {
    return this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('talent_pipeline_snapshot'))`);
      const emptyFilters: NormalizedTalentPipelineFilters = {
        functionName: null,
        orgUnit: null,
        range: null,
        location: null,
        gender: null,
        directOrIndirect: null,
      };
      const dashboard = await this.queryDashboard(
        emptyFilters,
        accountId,
        reportingMonth,
        client,
      );
      const snapshot = await client.query<{ id: string }>(
        `WITH next_version AS (
           SELECT COALESCE(MAX(version), 0) + 1 AS version
           FROM public.dashboard_json_snapshots
           WHERE dashboard_key = 'talent-pipeline' AND reporting_month = $1::date
         ), deactivate AS (
           UPDATE public.dashboard_json_snapshots
           SET is_active = FALSE
           WHERE dashboard_key = 'talent-pipeline'
             AND reporting_month = $1::date AND is_active
             RETURNING 1
         )
         INSERT INTO public.dashboard_json_snapshots (
           dashboard_key, reporting_month, version, payload, checksum,
           created_by, is_active
         )
         SELECT 'talent-pipeline', $1::date, next_version.version, $2::jsonb,
                MD5(($2::jsonb)::text), $3::uuid, TRUE
         FROM next_version
         RETURNING id::text`,
        [reportingMonth, JSON.stringify(dashboard), accountId],
      );
      const snapshotId = snapshot.rows[0]?.id;
      if (!snapshotId) throw new Error('SNAPSHOT_VERIFICATION_FAILED');
      const verification = await client.query<{ verified: boolean }>(
        `SELECT checksum = MD5(payload::text) AS verified
         FROM public.dashboard_json_snapshots WHERE id = $1::bigint`,
        [snapshotId],
      );
      if (!verification.rows[0]?.verified) throw new Error('SNAPSHOT_VERIFICATION_FAILED');
      return reportingMonth.slice(0, 7);
    });
  }

  private async queryDashboard(
    filters: NormalizedTalentPipelineFilters,
    accountId: string,
    reportingMonth: string | null,
    client: Pick<DatabaseService, 'query'> = this.database,
  ): Promise<unknown> {
    const result = await client.query<{ dashboard: unknown }>(`
      WITH settings AS (
        SELECT CASE
          WHEN $8::date IS NULL THEN CURRENT_DATE
          ELSE ($8::date + INTERVAL '1 month - 1 day')::date
        END AS as_of_date
      ),
      register_employees AS (
        SELECT pers_no FROM public.talent_pool_register
        UNION
        SELECT employee_no FROM public.development_pool_register
      ),
      filter_employees AS (
        SELECT DISTINCT
          NULLIF(BTRIM(e.function), '') AS function_name,
          NULLIF(BTRIM(e.organizational_unit), '') AS org_unit,
          NULLIF(BTRIM(e.range), '') AS range_name,
          NULLIF(BTRIM(e.location), '') AS location_name,
          NULLIF(BTRIM(e.gender_key), '') AS gender_name,
          NULLIF(BTRIM(e.direct_or_indirect), '') AS direct_or_indirect
        FROM register_employees register
        INNER JOIN public.employee_namelist e ON e.pers_no = register.pers_no
        WHERE EXISTS (
          SELECT 1 FROM public.master_access access
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
        'kpis', public.get_talent_pipeline_kpis(
          settings.as_of_date, $1, $2, $3, $4, $5, $6, $7::UUID
        ),
        'charts', public.get_talent_pipeline_charts(
          settings.as_of_date, $1, $2, $3, $4, $5, $6, $7::UUID
        ),
        'filterOptions', JSONB_BUILD_OBJECT(
          'functionName', TO_JSONB(ARRAY(
            SELECT DISTINCT e.function_name FROM filter_employees e
            WHERE e.function_name IS NOT NULL
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.function_name
          )),
          'orgUnit', TO_JSONB(ARRAY(
            SELECT DISTINCT e.org_unit FROM filter_employees e
            WHERE e.org_unit IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.org_unit
          )),
          'range', TO_JSONB(ARRAY(
            SELECT DISTINCT e.range_name FROM filter_employees e
            WHERE e.range_name IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.range_name
          )),
          'location', TO_JSONB(ARRAY(
            SELECT DISTINCT e.location_name FROM filter_employees e
            WHERE e.location_name IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($5::TEXT IS NULL OR e.gender_name = $5)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.location_name
          )),
          'gender', TO_JSONB(ARRAY(
            SELECT DISTINCT e.gender_name FROM filter_employees e
            WHERE e.gender_name IS NOT NULL
              AND ($1::TEXT IS NULL OR e.function_name = $1)
              AND ($2::TEXT IS NULL OR e.org_unit = $2)
              AND ($3::TEXT IS NULL OR e.range_name = $3)
              AND ($4::TEXT IS NULL OR e.location_name = $4)
              AND ($6::TEXT IS NULL OR e.direct_or_indirect = $6)
            ORDER BY e.gender_name
          )),
          'directOrIndirect', TO_JSONB(ARRAY(
            SELECT DISTINCT e.direct_or_indirect FROM filter_employees e
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
      FROM settings
    `, [
      filters.functionName,
      filters.orgUnit,
      filters.range,
      filters.location,
      filters.gender,
      filters.directOrIndirect,
      accountId,
      reportingMonth,
    ]);
    return result.rows[0]?.dashboard;
  }
}