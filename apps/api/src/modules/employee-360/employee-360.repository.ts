import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  Employee360FilterOptionsDto,
  EmployeePppHistoryDto,
  Employee360ResponseDto,
  Employee360RowDto,
  NormalizedEmployee360Query,
} from './dto/employee-360.dto';

type EmployeeRow = {
  pers_no: string;
  personnel_number: string | null;
  employee_group: string | null;
  ps_group: string | null;
  organizational_unit: string | null;
  range: string | null;
  function_name: string | null;
  gender_key: string | null;
  location: string | null;
  nt_id: string | null;
  global_id: string | null;
  cost_center: string | null;
  birth_date: Date | string | null;
  joining_date: Date | string | null;
  entry_for_retirement: Date | string | null;
  designation_text: string | null;
  hrbp_global_id: string | null;
  hrbp2_global_id: string | null;
  official_email: string | null;
  technical_entry_date: Date | string | null;
  direct_or_indirect: string | null;
  jd_id: string | null;
  jd_name: string | null;
};

type FilterOptionsRow = Employee360FilterOptionsDto;

function mapDate(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function mapEmployee(row: EmployeeRow): Employee360RowDto {
  return {
    persNo: row.pers_no,
    personnelNumber: row.personnel_number,
    employeeGroup: row.employee_group,
    psGroup: row.ps_group,
    orgUnit: row.organizational_unit,
    range: row.range,
    functionName: row.function_name,
    gender: row.gender_key,
    location: row.location,
    ntId: row.nt_id,
    globalId: row.global_id,
    costCenter: row.cost_center,
    birthDate: mapDate(row.birth_date),
    joiningDate: mapDate(row.joining_date),
    entryForRetirement: mapDate(row.entry_for_retirement),
    designationText: row.designation_text,
    hrbpGlobalId: row.hrbp_global_id,
    hrbp2GlobalId: row.hrbp2_global_id,
    officialEmail: row.official_email,
    technicalEntryDate: mapDate(row.technical_entry_date),
    directOrIndirect: row.direct_or_indirect,
    jdId: row.jd_id,
    jdName: row.jd_name,
  };
}

const scopedEmployees = `
  SELECT
    e.pers_no,
    e.personnel_number,
    e.employee_group,
    e.ps_group,
    e.organizational_unit,
    e.range,
    e.function,
    e.gender_key,
    e.location,
    e.nt_id,
    e.global_id,
    e.cost_center,
    e.birth_date,
    e.joining_date,
    e.entry_for_retirement,
    e.designation_text,
    e.hrbp_global_id,
    e.hrbp2_global_id,
    e.official_email,
    e.technical_entry_date,
    e.direct_or_indirect,
    assignment.jd_id,
    job.role_title AS jd_name
  FROM public.employee_namelist e
  LEFT JOIN public.employee_jd_assignments assignment ON assignment.pers_no = e.pers_no
  LEFT JOIN public.job_descriptions job ON job.jd_id = assignment.jd_id
  WHERE ($9::BIGINT IS NULL OR e.pers_no <> $9)
    AND ($1::TEXT IS NULL
      OR e.pers_no::TEXT ILIKE '%' || $1 || '%'
      OR e.personnel_number ILIKE '%' || $1 || '%')
    AND EXISTS (
      SELECT 1
      FROM public.master_access access
      WHERE access.account_id = $8::UUID
        AND (
          access.role IN ('hrbp', 'admin')
          OR (access.role = 'range_head'
            AND BTRIM(e.range) = BTRIM(access.assigned_range))
          OR (access.role IN ('department_head', 'sub_department_head')
            AND BTRIM(e.range) = BTRIM(access.assigned_range)
            AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit))
        )
    )
`;

@Injectable()
export class Employee360Repository {
  constructor(private readonly database: DatabaseService) {}

  async getPppHistory(persNo: string): Promise<EmployeePppHistoryDto[]> {
    const result = await this.database.query<{
      calendar_year: number;
      performance: string | null;
      position: string | null;
      person: string | null;
      tcl: string | null;
    }>(
      `SELECT calendar_year, performance, position, person, tcl
       FROM public.employee_ppp_history
       WHERE pers_no = $1
       ORDER BY calendar_year DESC`,
      [persNo],
    );
    return result.rows.map((row) => ({
      year: row.calendar_year,
      performance: row.performance,
      position: row.position,
      person: row.person,
      tcl: row.tcl,
    }));
  }

  async getEmployees(
    filters: NormalizedEmployee360Query,
    accountId: string,
    persNo: string | null,
  ): Promise<Employee360ResponseDto> {
    const values = [
      filters.search,
      filters.functionName,
      filters.orgUnit,
      filters.range,
      filters.location,
      filters.gender,
      filters.directOrIndirect,
      accountId,
      persNo,
    ];
    const [employeesResult, optionsResult] = await Promise.all([
      this.database.query<EmployeeRow>(`
        WITH scoped AS (${scopedEmployees})
        SELECT
          pers_no, personnel_number, employee_group, ps_group,
          organizational_unit, range, function AS function_name, gender_key,
          location, nt_id, global_id, cost_center, birth_date, joining_date,
          entry_for_retirement, designation_text, hrbp_global_id,
          hrbp2_global_id, official_email, technical_entry_date,
          direct_or_indirect, jd_id, jd_name
        FROM scoped e
        WHERE ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
          AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
          AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
          AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
          AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
          AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
        ORDER BY e.personnel_number, e.pers_no
      `, values),
      this.database.query<FilterOptionsRow>(`
        WITH scoped AS (${scopedEmployees})
        SELECT
          ARRAY(SELECT DISTINCT BTRIM(e.function) FROM scoped e
            WHERE NULLIF(BTRIM(e.function), '') IS NOT NULL
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS "functionName",
          ARRAY(SELECT DISTINCT BTRIM(e.organizational_unit) FROM scoped e
            WHERE NULLIF(BTRIM(e.organizational_unit), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS "orgUnit",
          ARRAY(SELECT DISTINCT BTRIM(e.range) FROM scoped e
            WHERE NULLIF(BTRIM(e.range), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS range,
          ARRAY(SELECT DISTINCT BTRIM(e.location) FROM scoped e
            WHERE NULLIF(BTRIM(e.location), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS location,
          ARRAY(SELECT DISTINCT BTRIM(e.gender_key) FROM scoped e
            WHERE NULLIF(BTRIM(e.gender_key), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($7::TEXT IS NULL OR BTRIM(e.direct_or_indirect) = $7)
            ORDER BY 1) AS gender,
          ARRAY(SELECT DISTINCT BTRIM(e.direct_or_indirect) FROM scoped e
            WHERE NULLIF(BTRIM(e.direct_or_indirect), '') IS NOT NULL
              AND ($2::TEXT IS NULL OR BTRIM(e.function) = $2)
              AND ($3::TEXT IS NULL OR BTRIM(e.organizational_unit) = $3)
              AND ($4::TEXT IS NULL OR BTRIM(e.range) = $4)
              AND ($5::TEXT IS NULL OR BTRIM(e.location) = $5)
              AND ($6::TEXT IS NULL OR BTRIM(e.gender_key) = $6)
            ORDER BY 1) AS "directOrIndirect"
      `, values),
    ]);

    return {
      employees: employeesResult.rows.map(mapEmployee),
      filterOptions: optionsResult.rows[0] ?? {
        functionName: [], orgUnit: [], range: [], location: [], gender: [], directOrIndirect: [],
      },
    };
  }

  updateJobDescription(
    persNo: string,
    jdId: string,
    effectiveDate: string,
    actorAccountId: string,
  ): Promise<{ jdId: string; jdName: string; effectiveDate: string; changed: boolean }> {
    return this.database.transaction(async (client) => {
      const job = await client.query<{ jd_id: string; role_title: string }>(
        `SELECT jd_id, role_title FROM public.job_descriptions
         WHERE LOWER(jd_id) = LOWER($1)`,
        [jdId],
      );
      if (!job.rows[0]) throw new Error('JD_NOT_FOUND');
      const current = await client.query<{ jd_id: string; role_title: string }>(
        `SELECT assignment.jd_id, job.role_title
         FROM public.employee_jd_assignments assignment
         JOIN public.job_descriptions job ON job.jd_id = assignment.jd_id
         WHERE assignment.pers_no = $1 FOR UPDATE OF assignment`,
        [persNo],
      );
      const selected = job.rows[0];
      const previous = current.rows[0];
      if (previous?.jd_id === selected.jd_id) {
        return { jdId: selected.jd_id, jdName: selected.role_title, effectiveDate, changed: false };
      }
      await client.query(
        `INSERT INTO public.employee_jd_movements (
           pers_no, old_jd_id, old_role_title, new_jd_id, new_role_title,
           effective_date, source, changed_by_account_id
         ) VALUES ($1, $2, $3, $4, $5, $6, 'manual', $7)`,
        [persNo, previous?.jd_id ?? null, previous?.role_title ?? null, selected.jd_id, selected.role_title, effectiveDate, actorAccountId],
      );
      await client.query(
        `INSERT INTO public.employee_jd_assignments (
           pers_no, jd_id, effective_date, source, source_import_id, updated_by_account_id
         ) VALUES ($1, $2, $3, 'manual', NULL, $4)
         ON CONFLICT (pers_no) DO UPDATE SET
           jd_id = EXCLUDED.jd_id, effective_date = EXCLUDED.effective_date,
           source = 'manual', source_import_id = NULL,
           updated_by_account_id = EXCLUDED.updated_by_account_id,
           updated_at = CURRENT_TIMESTAMP`,
        [persNo, selected.jd_id, effectiveDate, actorAccountId],
      );
      await client.query(
        `INSERT INTO public.security_audit_log (event_type, actor_account_id, event_details)
         VALUES ('employee_jd_assignment_updated', $1, $2)`,
        [actorAccountId, {
          persNo,
          oldJdId: previous?.jd_id ?? null,
          newJdId: selected.jd_id,
          effectiveDate,
        }],
      );
      return { jdId: selected.jd_id, jdName: selected.role_title, effectiveDate, changed: true };
    });
  }
}