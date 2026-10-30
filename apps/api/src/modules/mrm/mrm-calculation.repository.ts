import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { MrmMetricBucket, MrmSourceStatus } from './mrm.types';

export type MrmQueryExecutor = Pick<DatabaseService, 'query'>;

function monthDate(month: string): string {
  return `${month}-01`;
}

export type MrmEmployeeSourceRow = {
  range: string;
  org_unit: string;
  direct_or_indirect: string;
  employee_group: string;
  ps_group: string;
  gender_key: string;
  joined_in_month: boolean;
};

export type MrmAttritionSourceRow = {
  range: string;
  org_unit: string;
  filter_value: string;
  reason_for_action: string;
};

@Injectable()
export class MrmCalculationRepository {
  constructor(private readonly database: DatabaseService) {}

  async getSourceStatus(
    dataMonth: string,
    executor: MrmQueryExecutor = this.database,
  ): Promise<MrmSourceStatus> {
    const result = await executor.query<{
      live_available: boolean;
      history_available: boolean;
      snapshot_available: boolean;
    }>(
      `SELECT COALESCE((
         SELECT reporting_month = $1::date
         FROM public.namelist_imports
         WHERE reporting_month_confirmed
           AND import_mode = 'live' AND status = 'completed'
         ORDER BY reporting_month DESC, imported_at DESC, id DESC
         LIMIT 1
       ), FALSE) AS live_available,
       EXISTS (
         SELECT 1 FROM public.employee_namelist_monthly
         WHERE reporting_month = $1::date
       ) AS history_available,
       EXISTS (
         SELECT 1 FROM public.mrm_monthly_snapshots
         WHERE data_month = $1::date
       ) AS snapshot_available`,
      [monthDate(dataMonth)],
    );
    const status = result.rows[0];
    return {
      available: Boolean(
        status?.live_available || status?.history_available || status?.snapshot_available
      ),
      source: status?.live_available
        ? 'live'
        : status?.history_available
          ? 'history'
          : status?.snapshot_available
            ? 'snapshot'
            : null,
    };
  }

  async getEmployees(
    dataMonth: string,
    accountId: string,
    source: 'live' | 'history',
    executor: MrmQueryExecutor = this.database,
  ): Promise<MrmEmployeeSourceRow[]> {
    const table = source === 'live'
      ? 'public.employee_namelist'
      : 'public.employee_namelist_monthly';
    const monthPredicate = source === 'live' ? '' : 'AND employee.reporting_month = $1::date';
    const result = await executor.query<MrmEmployeeSourceRow>(
      `SELECT COALESCE(employee.range, '') AS range,
              COALESCE(employee.organizational_unit, '') AS org_unit,
              COALESCE(employee.direct_or_indirect, '') AS direct_or_indirect,
              COALESCE(employee.employee_group, '') AS employee_group,
              COALESCE(employee.ps_group, '') AS ps_group,
              COALESCE(employee.gender_key, '') AS gender_key,
              employee.joining_date >= $1::date
                AND employee.joining_date < ($1::date + INTERVAL '1 month') AS joined_in_month
       FROM ${table} employee
       WHERE TRUE ${monthPredicate}
         AND EXISTS (
           SELECT 1 FROM public.master_access access
           WHERE access.account_id = $2::uuid
             AND (
               access.role IN ('hrbp', 'admin')
               OR (access.role = 'range_head'
                 AND BTRIM(employee.range) = BTRIM(access.assigned_range))
               OR (access.role IN ('department_head', 'sub_department_head')
                 AND BTRIM(employee.range) = BTRIM(access.assigned_range)
                 AND BTRIM(employee.organizational_unit) = BTRIM(access.assigned_org_unit))
             )
         )`,
      [monthDate(dataMonth), accountId],
    );
    return result.rows;
  }

  async getAttrition(
    dataMonth: string,
    accountId: string,
    executor: MrmQueryExecutor = this.database,
  ): Promise<MrmAttritionSourceRow[]> {
    const result = await executor.query<MrmAttritionSourceRow>(
      `SELECT COALESCE(row.range, '') AS range,
              COALESCE(row.org_unit, '') AS org_unit,
              COALESCE(row.filter_value, '') AS filter_value,
              COALESCE(row.reason_for_action, '') AS reason_for_action
       FROM public.attrition_rows row
       WHERE row.lwd >= $1::date
         AND row.lwd < ($1::date + INTERVAL '1 month')
         AND EXISTS (
           SELECT 1 FROM public.master_access access
           WHERE access.account_id = $2::uuid
             AND (
               access.role IN ('hrbp', 'admin')
               OR (access.role = 'range_head'
                 AND BTRIM(row.range) = BTRIM(access.assigned_range))
               OR (access.role IN ('department_head', 'sub_department_head')
                 AND BTRIM(row.range) = BTRIM(access.assigned_range)
                 AND BTRIM(row.org_unit) = BTRIM(access.assigned_org_unit))
             )
         )`,
      [monthDate(dataMonth), accountId],
    );
    return result.rows;
  }

  async getSnapshotBuckets(
    dataMonth: string,
    accountId: string,
    executor: MrmQueryExecutor = this.database,
  ): Promise<MrmMetricBucket[]> {
    const result = await executor.query<{
      metric_key: string;
      numerator: string;
      denominator: string | null;
      quality_count: string;
    }>(
      `SELECT bucket.metric_key,
              SUM(bucket.numerator)::text AS numerator,
              CASE WHEN BOOL_OR(bucket.denominator IS NOT NULL)
                THEN SUM(COALESCE(bucket.denominator, 0))::text END AS denominator,
              SUM(bucket.quality_count)::text AS quality_count
       FROM public.mrm_monthly_metric_snapshots bucket
       WHERE bucket.data_month = $1::date
         AND EXISTS (
           SELECT 1 FROM public.master_access access
           WHERE access.account_id = $2::uuid
             AND (
               access.role IN ('hrbp', 'admin')
               OR (access.role = 'range_head'
                 AND bucket.range_key = UPPER(REGEXP_REPLACE(BTRIM(access.assigned_range), '[[:space:]]+', ' ', 'g')))
               OR (access.role IN ('department_head', 'sub_department_head')
                 AND bucket.range_key = UPPER(REGEXP_REPLACE(BTRIM(access.assigned_range), '[[:space:]]+', ' ', 'g'))
                 AND bucket.org_unit_key = UPPER(REGEXP_REPLACE(BTRIM(access.assigned_org_unit), '[[:space:]]+', ' ', 'g')))
             )
         )
       GROUP BY bucket.metric_key ORDER BY bucket.metric_key`,
      [monthDate(dataMonth), accountId],
    );
    return result.rows.map((row) => ({
      dataMonth,
      metricKey: row.metric_key,
      rangeKey: '',
      orgUnitKey: '',
      numerator: Number(row.numerator),
      denominator: row.denominator === null ? null : Number(row.denominator),
      qualityCount: Number(row.quality_count),
    }));
  }

  async replaceMonthlySnapshot(
    dataMonth: string,
    accountId: string,
    buckets: MrmMetricBucket[],
    executor: MrmQueryExecutor,
  ): Promise<void> {
    const sourceImport = await executor.query<{ source_import_id: string | null }>(
      `SELECT MAX(source_import_id)::text AS source_import_id
       FROM public.employee_namelist_monthly
       WHERE reporting_month = $1::date`,
      [monthDate(dataMonth)],
    );
    await executor.query(
      `DELETE FROM public.mrm_monthly_snapshots WHERE data_month = $1::date`,
      [monthDate(dataMonth)],
    );
    await executor.query(
      `INSERT INTO public.mrm_monthly_snapshots (
         data_month, source_import_id, created_by
       ) VALUES ($1::date, $2::bigint, $3::uuid)`,
      [monthDate(dataMonth), sourceImport.rows[0]?.source_import_id ?? null, accountId],
    );
    for (const bucket of buckets) {
      await executor.query(
        `INSERT INTO public.mrm_monthly_metric_snapshots (
           data_month, metric_key, range_key, org_unit_key,
           numerator, denominator, quality_count
         ) VALUES ($1::date, $2, $3, $4, $5, $6, $7)`,
        [monthDate(dataMonth), bucket.metricKey, bucket.rangeKey, bucket.orgUnitKey,
          bucket.numerator, bucket.denominator, bucket.qualityCount],
      );
    }
  }
}