import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { MrmSourceStatus } from './mrm.types';

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

  async getSourceStatus(dataMonth: string): Promise<MrmSourceStatus> {
    const result = await this.database.query<{
      live_available: boolean;
      history_available: boolean;
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
       ) AS history_available`,
      [monthDate(dataMonth)],
    );
    const status = result.rows[0];
    return {
      available: Boolean(status?.live_available || status?.history_available),
      source: status?.live_available
        ? 'live'
        : status?.history_available
          ? 'history'
          : null,
    };
  }

  async getEmployees(
    dataMonth: string,
    accountId: string,
    source: 'live' | 'history',
  ): Promise<MrmEmployeeSourceRow[]> {
    const table = source === 'live'
      ? 'public.employee_namelist'
      : 'public.employee_namelist_monthly';
    const monthPredicate = source === 'live' ? '' : 'AND employee.reporting_month = $1::date';
    const result = await this.database.query<MrmEmployeeSourceRow>(
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
  ): Promise<MrmAttritionSourceRow[]> {
    const result = await this.database.query<MrmAttritionSourceRow>(
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
}