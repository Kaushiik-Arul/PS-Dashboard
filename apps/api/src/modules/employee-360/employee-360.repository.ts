import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  EmployeeDevelopmentPortfolioDto,
  EmployeeIdpStatusDto,
  EmployeeStepAvailabilityDto,
  EmployeeStepOverviewDto,
  EmployeeSuccessionPortfolioDto,
  EmployeeTalentPortfolioDto,
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
    e.birth_date::TEXT AS birth_date,
    e.joining_date::TEXT AS joining_date,
    e.entry_for_retirement::TEXT AS entry_for_retirement,
    e.designation_text,
    e.hrbp_global_id,
    e.hrbp2_global_id,
    e.official_email,
    e.technical_entry_date::TEXT AS technical_entry_date,
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

  async getIdpStatus(persNo: string): Promise<EmployeeIdpStatusDto> {
    const result = await this.database.query<{
      available: boolean;
      comments: string | null;
    }>(
      `SELECT
         status.pers_no IS NOT NULL AS available,
         NULLIF(BTRIM(status.comments), '') AS comments
       FROM (SELECT 1) seed
       LEFT JOIN public.employee_idp_status status
         ON status.pers_no = $1::BIGINT`,
      [persNo],
    );
    const row = result.rows[0];
    return {
      available: row.available,
      comments: row.available ? row.comments : null,
    };
  }

  async updateIdpStatus(
    persNo: string,
    available: boolean,
    comments: string | null,
    actor: string,
  ): Promise<EmployeeIdpStatusDto> {
    if (available) {
      await this.database.query(
        `INSERT INTO public.employee_idp_status (pers_no, comments, updated_by)
         VALUES ($1::BIGINT, $2, $3::UUID)
         ON CONFLICT (pers_no) DO UPDATE SET
           comments = EXCLUDED.comments,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [persNo, comments ?? '', actor],
      );
    } else {
      await this.database.query(
        `DELETE FROM public.employee_idp_status WHERE pers_no = $1::BIGINT`,
        [persNo],
      );
    }
    return { available, comments: available ? comments : null };
  }

  async updateStepAvailability(
    persNo: string,
    available: boolean,
    preferences: string | null,
    comments: string | null,
    actor: string,
  ): Promise<EmployeeStepAvailabilityDto> {
    return this.database.transaction(async (client) => {
      await client.query(
        `SELECT revision
         FROM public.available_talent_state
         WHERE kind = 'available'
         FOR UPDATE`,
      );

      if (available) {
        const result = await client.query(
          `INSERT INTO public.available_talent_rows (
             kind, pers_no, employee_name, entity, department, hrbp,
             preferences, current_status, comments, jd_id, updated_by
           )
           SELECT
             'available', e.pers_no, COALESCE(e.personnel_number, ''),
             COALESCE(e.lp, ''), COALESCE(e.organizational_unit, ''),
             COALESCE(e.hrbp2_global_id, ''), $2, '', $3, '', $4::UUID
           FROM public.employee_namelist e
           WHERE e.pers_no = $1::BIGINT
           ON CONFLICT (kind, pers_no) DO UPDATE SET
             preferences = EXCLUDED.preferences,
             comments = EXCLUDED.comments,
             updated_by = EXCLUDED.updated_by,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [persNo, preferences ?? '', comments ?? '', actor],
        );
        if (!result.rowCount) throw new Error('EMPLOYEE_NOT_FOUND');
      } else {
        await client.query(
          `DELETE FROM public.available_talent_rows
           WHERE kind = 'available' AND pers_no = $1::BIGINT`,
          [persNo],
        );
      }

      await client.query(
        `UPDATE public.available_talent_state
         SET revision = revision + 1
         WHERE kind = 'available'`,
      );
      return {
        available,
        preferences: available ? preferences : null,
        comments: available ? comments : null,
      };
    });
  }

  async getDevelopmentPortfolio(
    persNo: string,
  ): Promise<EmployeeDevelopmentPortfolioDto | null> {
    const result = await this.database.query<{
      development_pool: string | null;
      pool_start_date: Date | string;
      pool_end_date: Date | string;
    }>(
      `SELECT
         NULLIF(BTRIM(development_pool), '') AS development_pool,
        pool_start_date::TEXT AS pool_start_date,
        pool_end_date::TEXT AS pool_end_date
       FROM public.development_pool_register
       WHERE employee_no = $1::BIGINT
       LIMIT 1`,
      [persNo],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      developmentPool: row.development_pool ?? 'Not available',
      poolStartDate: mapDate(row.pool_start_date) ?? 'Not available',
      poolEndDate: mapDate(row.pool_end_date) ?? 'Not available',
    };
  }

  async getSuccessionPortfolio(
    persNo: string,
  ): Promise<EmployeeSuccessionPortfolioDto> {
    const result = await this.database.query<{
      successor: 1 | 2;
      jd_id: string;
      jd_name: string;
    }>(
      `SELECT DISTINCT ON (successor)
         successor,
         position_jd_id AS jd_id,
         jd_name
       FROM (
         SELECT 1 AS successor, position_jd_id, jd_name, updated_at, id
         FROM public.succession_planning_rows
         WHERE BTRIM(successor1_pers_no) = $1
         UNION ALL
         SELECT 2 AS successor, position_jd_id, jd_name, updated_at, id
         FROM public.succession_planning_rows
         WHERE BTRIM(successor2_pers_no) = $1
       ) assignments
       ORDER BY successor, updated_at DESC, id DESC`,
      [persNo],
    );
    const entry = (successor: 1 | 2) => {
      const row = result.rows.find((item) => item.successor === successor);
      return row ? { jdId: row.jd_id, jdName: row.jd_name } : null;
    };
    return { successor1: entry(1), successor2: entry(2) };
  }

  async getTalentPortfolio(persNo: string): Promise<EmployeeTalentPortfolioDto> {
    const result = await this.database.query<{
      talent_status: string | null;
      talent_type: string | null;
      talent_from_date: Date | string | null;
      talent_to_date: Date | string | null;
      nomination_type: string | null;
      nomination_admission: string | null;
    }>(
      `SELECT
         LOWER(NULLIF(BTRIM(talent.active_passive), '')) AS talent_status,
         NULLIF(BTRIM(talent.talent_pool), '') AS talent_type,
         talent.from_date::TEXT AS talent_from_date,
         talent.to_date::TEXT AS talent_to_date,
         NULLIF(BTRIM(nomination.talent_pool), '') AS nomination_type,
         NULLIF(BTRIM(nomination.admission), '') AS nomination_admission
       FROM (SELECT 1) seed
       LEFT JOIN public.talent_pool_register talent
         ON talent.pers_no = $1::BIGINT
       LEFT JOIN LATERAL (
         SELECT talent_pool, admission
         FROM public.nomination_status_rows
         WHERE employee_no = $1::BIGINT
         ORDER BY year DESC, updated_at DESC, id DESC
         LIMIT 1
       ) nomination ON TRUE`,
      [persNo],
    );
    const row = result.rows[0];
    const talentEntry = row.talent_type && row.talent_from_date && row.talent_to_date
      ? {
          type: row.talent_type,
          startDate: mapDate(row.talent_from_date),
          endDateOrAdmission: mapDate(row.talent_to_date) ?? 'Not available',
        }
      : null;
    const nomination = row.nomination_type
      ? {
          type: row.nomination_type,
          startDate: null,
          endDateOrAdmission: row.nomination_admission ?? 'Not available',
        }
      : null;
    return {
      active: row.talent_status === 'active' ? talentEntry : null,
      passive: row.talent_status === 'passive' ? talentEntry : null,
      nomination,
    };
  }

  async getStepOverview(persNo: string): Promise<EmployeeStepOverviewDto> {
    const result = await this.database.query<{
      active_year: number | null;
      department_from: string | null;
      department_to: string | null;
      exchanged_with: string | null;
      step_period_from: Date | string | null;
      step_period_to: Date | string | null;
      available: boolean;
      preferences: string | null;
      comments: string | null;
    }>(
      `SELECT
         active.year AS active_year,
         NULLIF(BTRIM(active.dept_from), '') AS department_from,
         NULLIF(BTRIM(active.dept_to), '') AS department_to,
         NULLIF(BTRIM(active.exchanged_with), '') AS exchanged_with,
         active.step_from::TEXT AS step_period_from,
         active.step_to::TEXT AS step_period_to,
         available.pers_no IS NOT NULL AS available,
         NULLIF(BTRIM(available.preferences), '') AS preferences,
         NULLIF(BTRIM(available.comments), '') AS comments
       FROM (SELECT 1) seed
       LEFT JOIN LATERAL (
         SELECT year, dept_from, dept_to, exchanged_with, step_from, step_to
         FROM public.active_step_rows
         WHERE pers_no = $1::BIGINT
         ORDER BY year DESC, step_from DESC, source_row_number DESC
         LIMIT 1
       ) active ON TRUE
       LEFT JOIN public.available_talent_rows available
         ON available.kind = 'available'
        AND available.pers_no = $1::BIGINT`,
      [persNo],
    );
    const row = result.rows[0];
    return {
      active: row.active_year === null
        ? null
        : {
            year: row.active_year,
            departmentFrom: row.department_from,
            departmentTo: row.department_to,
            exchangedWith: row.exchanged_with,
            stepPeriodFrom: mapDate(row.step_period_from),
            stepPeriodTo: mapDate(row.step_period_to),
          },
      availability: {
        available: row.available,
        preferences: row.available ? row.preferences : null,
        comments: row.available ? row.comments : null,
      },
    };
  }

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
        WHERE (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR BTRIM(e.function) = ANY($2::TEXT[]))
          AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR BTRIM(e.organizational_unit) = ANY($3::TEXT[]))
          AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR BTRIM(e.range) = ANY($4::TEXT[]))
          AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR BTRIM(e.location) = ANY($5::TEXT[]))
          AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR BTRIM(e.gender_key) = ANY($6::TEXT[]))
          AND (COALESCE(CARDINALITY($7::TEXT[]), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY($7::TEXT[]))
        ORDER BY e.personnel_number, e.pers_no
      `, values),
      this.database.query<FilterOptionsRow>(`
        WITH scoped AS (${scopedEmployees})
        SELECT
          ARRAY(SELECT DISTINCT BTRIM(e.function) FROM scoped e
            WHERE NULLIF(BTRIM(e.function), '') IS NOT NULL
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR BTRIM(e.organizational_unit) = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR BTRIM(e.range) = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR BTRIM(e.location) = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR BTRIM(e.gender_key) = ANY($6::TEXT[]))
              AND (COALESCE(CARDINALITY($7::TEXT[]), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY($7::TEXT[]))
            ORDER BY 1) AS "functionName",
          ARRAY(SELECT DISTINCT BTRIM(e.organizational_unit) FROM scoped e
            WHERE NULLIF(BTRIM(e.organizational_unit), '') IS NOT NULL
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR BTRIM(e.function) = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR BTRIM(e.range) = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR BTRIM(e.location) = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR BTRIM(e.gender_key) = ANY($6::TEXT[]))
              AND (COALESCE(CARDINALITY($7::TEXT[]), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY($7::TEXT[]))
            ORDER BY 1) AS "orgUnit",
          ARRAY(SELECT DISTINCT BTRIM(e.range) FROM scoped e
            WHERE NULLIF(BTRIM(e.range), '') IS NOT NULL
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR BTRIM(e.function) = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR BTRIM(e.organizational_unit) = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR BTRIM(e.location) = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR BTRIM(e.gender_key) = ANY($6::TEXT[]))
              AND (COALESCE(CARDINALITY($7::TEXT[]), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY($7::TEXT[]))
            ORDER BY 1) AS range,
          ARRAY(SELECT DISTINCT BTRIM(e.location) FROM scoped e
            WHERE NULLIF(BTRIM(e.location), '') IS NOT NULL
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR BTRIM(e.function) = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR BTRIM(e.organizational_unit) = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR BTRIM(e.range) = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR BTRIM(e.gender_key) = ANY($6::TEXT[]))
              AND (COALESCE(CARDINALITY($7::TEXT[]), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY($7::TEXT[]))
            ORDER BY 1) AS location,
          ARRAY(SELECT DISTINCT BTRIM(e.gender_key) FROM scoped e
            WHERE NULLIF(BTRIM(e.gender_key), '') IS NOT NULL
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR BTRIM(e.function) = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR BTRIM(e.organizational_unit) = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR BTRIM(e.range) = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR BTRIM(e.location) = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($7::TEXT[]), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY($7::TEXT[]))
            ORDER BY 1) AS gender,
          ARRAY(SELECT DISTINCT BTRIM(e.direct_or_indirect) FROM scoped e
            WHERE NULLIF(BTRIM(e.direct_or_indirect), '') IS NOT NULL
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR BTRIM(e.function) = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR BTRIM(e.organizational_unit) = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR BTRIM(e.range) = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR BTRIM(e.location) = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR BTRIM(e.gender_key) = ANY($6::TEXT[]))
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
         LEFT JOIN public.job_descriptions job ON job.jd_id = assignment.jd_id
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
