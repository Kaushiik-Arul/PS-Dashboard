import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { SuccessionPlanningValues } from '../hrbp-point/succession-planning-import/succession-planning-import.types';

export type SuccessionPlanningRecord = SuccessionPlanningValues & { id: string };

@Injectable()
export class SuccessionPlanningService {
  constructor(private readonly database: DatabaseService) {}

  async getRegister(accountId: string) {
    const [state, rows] = await Promise.all([
      this.database.query<{
        revision: string;
        file_name: string | null;
        imported_at: string | null;
      }>(
        `SELECT state.revision::TEXT AS revision,
                latest.file_name,
                latest.imported_at::TEXT AS imported_at
         FROM public.succession_planning_state state
         LEFT JOIN LATERAL (
           SELECT file_name, imported_at
           FROM public.succession_planning_imports
           ORDER BY imported_at DESC, id DESC LIMIT 1
         ) latest ON TRUE
         WHERE state.singleton = TRUE`,
      ),
      this.database.query<SuccessionPlanningRecord>(
        `SELECT row.id::TEXT,
                row.entity, row.updated_by_name, row.area,
                row.position_jd_id, row.jd_name, row.ipe_level,
                row.employee_subgroup, row.criticality, row.priority,
                row.incumbent_pers_no::TEXT, row.incumbent_name,
                row.incumbent_org_unit, row.incumbent_range,
                COALESCE(row.incumbent_tenure_years::TEXT, '') AS incumbent_tenure_years,
                COALESCE(row.incumbent_age::TEXT, '') AS incumbent_age,
                COALESCE(row.incumbent_change_year::TEXT, '') AS incumbent_change_year,
                row.incumbent_9_box_rating, row.reason_for_change,
                COALESCE(row.successor1_pers_no::TEXT, '') AS successor1_pers_no,
                row.successor1_name, row.successor1_dept_code,
                row.successor1_current_jd_id, row.successor1_readiness,
                row.successor1_9_box_rating, row.successor1_idp_status,
                COALESCE(row.successor2_pers_no::TEXT, '') AS successor2_pers_no,
                row.successor2_name, row.successor2_dept_code,
                row.successor2_current_jd_id, row.successor2_readiness,
                row.successor2_9_box_rating, row.successor2_idp_status
         FROM public.succession_planning_rows row
         WHERE EXISTS (
           SELECT 1 FROM public.master_access access
           WHERE access.account_id = $1::UUID
             AND (
               access.role IN ('hrbp', 'admin')
               OR EXISTS (
                 SELECT 1 FROM public.employee_namelist employee
                 WHERE employee.pers_no::TEXT = ANY(
                   REGEXP_SPLIT_TO_ARRAY(row.incumbent_pers_no, '[^0-9]+')
                 )
                   AND (
                     (access.role = 'range_head'
                       AND BTRIM(employee.range) = BTRIM(access.assigned_range))
                     OR (access.role IN ('department_head', 'sub_department_head')
                       AND BTRIM(employee.range) = BTRIM(access.assigned_range)
                       AND BTRIM(employee.organizational_unit) = BTRIM(access.assigned_org_unit))
                   )
               )
             )
         )
         ORDER BY row.area, row.position_jd_id, row.id`,
        [accountId],
      ),
    ]);
    return {
      revision: state.rows[0]?.revision ?? '0',
      fileName: state.rows[0]?.file_name ?? null,
      importedAt: state.rows[0]?.imported_at ?? null,
      rows: rows.rows,
    };
  }
}
