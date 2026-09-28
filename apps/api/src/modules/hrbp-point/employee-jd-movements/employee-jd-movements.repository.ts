import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type {
  EmployeeJdMovement,
  EmployeeJdMovementFilters,
  EmployeeJdMovementPage,
} from './employee-jd-movements.types';

type MovementRow = {
  movement_id: string; pers_no: string; personnel_number: string | null;
  effective_date: Date | string; old_jd_id: string | null; old_role_title: string | null;
  new_jd_id: string | null; new_role_title: string | null; source: 'upload' | 'manual';
  changed_by: string | null; occurred_at: Date | string;
};

const predicate = `WHERE ($1::TEXT = '' OR movement.pers_no::TEXT ILIKE '%' || $1 || '%'
    OR employee.personnel_number ILIKE '%' || $1 || '%')
  AND ($2::TEXT = '' OR movement.source = $2)
  AND ($3::DATE IS NULL OR movement.effective_date >= $3)
  AND ($4::DATE IS NULL OR movement.effective_date <= $4)
  AND ($5::TEXT = '' OR COALESCE(movement.old_role_title, '') ILIKE '%' || $5 || '%'
    OR COALESCE(movement.new_role_title, '') ILIKE '%' || $5 || '%')`;

@Injectable()
export class EmployeeJdMovementsRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(filters: EmployeeJdMovementFilters, page: number, pageSize: number): Promise<EmployeeJdMovementPage> {
    const values = [filters.search, filters.source, filters.fromDate, filters.toDate, filters.role];
    const [items, count] = await Promise.all([
      this.database.query<MovementRow>(
        `SELECT movement.movement_id, movement.pers_no::TEXT, employee.personnel_number,
                movement.effective_date, movement.old_jd_id, movement.old_role_title,
                movement.new_jd_id, movement.new_role_title, movement.source,
                COALESCE(account.display_name, movement.changed_by_account_id::TEXT, 'System') AS changed_by,
                movement.occurred_at
         FROM public.employee_jd_movements movement
         LEFT JOIN public.employee_namelist employee ON employee.pers_no = movement.pers_no
         LEFT JOIN public.auth_accounts account ON account.account_id = movement.changed_by_account_id
         ${predicate}
         ORDER BY movement.effective_date DESC, movement.occurred_at DESC
         LIMIT $6 OFFSET $7`,
        [...values, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count
         FROM public.employee_jd_movements movement
         LEFT JOIN public.employee_namelist employee ON employee.pers_no = movement.pers_no
         ${predicate}`,
        values,
      ),
    ]);
    return {
      items: items.rows.map((row): EmployeeJdMovement => ({
        id: row.movement_id,
        persNo: row.pers_no,
        employeeName: row.personnel_number,
        effectiveDate: row.effective_date instanceof Date ? row.effective_date.toISOString().slice(0, 10) : row.effective_date.slice(0, 10),
        oldJdId: row.old_jd_id,
        oldRoleTitle: row.old_role_title,
        newJdId: row.new_jd_id,
        newRoleTitle: row.new_role_title,
        source: row.source,
        changedBy: row.changed_by ?? 'System',
        occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : new Date(row.occurred_at).toISOString(),
      })),
      total: Number(count.rows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }
}