import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  AttritionFilterDto,
  NormalizedAttritionFilters,
} from './dto/attrition-filter.dto';

const separationTypes = ['Resignation', 'Transfer', 'Retirement', 'Other'] as const;
type SeparationType = (typeof separationTypes)[number];

type AttritionRecord = {
  id: string;
  pers_no: string;
  employee_name: string;
  ps_group: string;
  gender_key: string;
  filter_value: string;
  reason_for_action: string;
  detailed_reason_approved: string;
  org_unit: string;
  range: string;
  initiated_date: string;
  lwd: string;
  lwd_year: number | null;
  lwd_month: number | null;
  e_separation_request_no: string;
  to_org_unit: string;
};

type ClassifiedAttritionRecord = AttritionRecord & { separationType: SeparationType };

function normalizedKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function classifySeparation(row: AttritionRecord): SeparationType {
  const source = `${row.filter_value} ${row.reason_for_action}`.toLowerCase();
  if (/retir/.test(source)) return 'Retirement';
  if (/transfer/.test(source)) return 'Transfer';
  if (/resign|separation|exit/.test(source)) return 'Resignation';
  return 'Other';
}

function sortValues(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true }),
  );
}

@Injectable()
export class AttritionService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(accountId: string, input: AttritionFilterDto = {}) {
    const filters = this.normalizeFilters(input);
    const [state, result, access] = await Promise.all([
      this.database.query<{
        revision: string;
        file_name: string | null;
        imported_at: string | null;
      }>(
        `SELECT state.revision::TEXT AS revision,
                latest.file_name,
                latest.imported_at::TEXT AS imported_at
         FROM public.attrition_state state
         LEFT JOIN LATERAL (
           SELECT file_name, imported_at
           FROM public.attrition_imports
           ORDER BY imported_at DESC, id DESC LIMIT 1
         ) latest ON TRUE
         WHERE state.singleton = TRUE`,
      ),
      this.database.query<AttritionRecord>(
        `SELECT row.id::TEXT,
                row.pers_no::TEXT,
                COALESCE(row.employee_name, '') AS employee_name,
                COALESCE(row.ps_group, '') AS ps_group,
                COALESCE(row.gender_key, '') AS gender_key,
                COALESCE(row.filter_value, '') AS filter_value,
                COALESCE(row.reason_for_action, '') AS reason_for_action,
                COALESCE(row.detailed_reason_approved, '') AS detailed_reason_approved,
                COALESCE(row.org_unit, '') AS org_unit,
                COALESCE(row.range, '') AS range,
                COALESCE(TO_CHAR(row.initiated_date, 'DD.MM.YYYY'), '') AS initiated_date,
                COALESCE(TO_CHAR(row.lwd, 'DD.MM.YYYY'), '') AS lwd,
                EXTRACT(YEAR FROM row.lwd)::INTEGER AS lwd_year,
                EXTRACT(MONTH FROM row.lwd)::INTEGER AS lwd_month,
                COALESCE(row.e_separation_request_no, '') AS e_separation_request_no,
                COALESCE(row.to_org_unit, '') AS to_org_unit
         FROM public.attrition_rows row
         WHERE EXISTS (
           SELECT 1 FROM public.master_access access
           WHERE access.account_id = $1::UUID
             AND (
               access.role IN ('hrbp', 'admin')
               OR (access.role = 'range_head'
                 AND BTRIM(COALESCE(row.range, '')) = BTRIM(access.assigned_range))
               OR (access.role IN ('department_head', 'sub_department_head')
                 AND BTRIM(COALESCE(row.range, '')) = BTRIM(access.assigned_range)
                 AND BTRIM(COALESCE(row.org_unit, '')) = BTRIM(access.assigned_org_unit))
             )
         )
         ORDER BY row.lwd DESC NULLS LAST, row.pers_no, row.id`,
        [accountId],
      ),
      this.database.query<{ unrestricted: boolean; range_scoped: boolean }>(
        `SELECT COALESCE(BOOL_OR(role IN ('hrbp', 'admin')), FALSE) AS unrestricted,
                COALESCE(BOOL_OR(role = 'range_head'), FALSE) AS range_scoped
         FROM public.master_access WHERE account_id = $1::UUID`,
        [accountId],
      ),
    ]);

    const authorizedRows: ClassifiedAttritionRecord[] = result.rows.map((row) => ({
      ...row,
      separationType: classifySeparation(row),
    }));
    const rows = authorizedRows.filter((row) => this.matches(row, filters));
    const headcountByMonth = await this.getMonthlyHeadcount(accountId, filters);
    const trend = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const count = rows.filter((row) => row.lwd_month === month).length;
      const headcount = headcountByMonth.get(month) ?? null;
      return {
        month,
        count,
        headcount,
        rate: headcount && headcount > 0
          ? Number(((count / headcount) * 100).toFixed(2))
          : null,
      };
    });
    const availableHeadcounts = trend.flatMap((item) =>
      item.headcount === null ? [] : [item.headcount],
    );
    const averageHeadcount = availableHeadcounts.length
      ? availableHeadcounts.reduce((total, value) => total + value, 0) / availableHeadcounts.length
      : null;
    const countType = (type: SeparationType) =>
      rows.filter((row) => row.separationType === type).length;
    const reasonCounts = new Map<string, number>();
    rows.forEach((row) => {
      const reason = row.detailed_reason_approved.trim()
        || row.reason_for_action.trim()
        || 'Other / Not specified';
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    });
    const accessFlags = access.rows[0];

    return {
      revision: state.rows[0]?.revision ?? '0',
      fileName: state.rows[0]?.file_name ?? null,
      importedAt: state.rows[0]?.imported_at ?? null,
      selectedYears: filters.years,
      organizationScope: accessFlags?.unrestricted
        ? 'unrestricted'
        : accessFlags?.range_scoped
          ? 'range'
          : 'rangeOrgUnit',
      rows: rows.map(({ lwd_year, lwd_month, separationType: rowType, ...row }) => row),
      filterOptions: this.buildFilterOptions(authorizedRows, filters),
      kpis: {
        total: rows.length,
        resignations: countType('Resignation'),
        transfers: countType('Transfer'),
        retirements: countType('Retirement'),
        female: rows.filter((row) => normalizedKey(row.gender_key) === 'FEMALE').length,
        averageHeadcount: averageHeadcount === null ? null : Math.round(averageHeadcount),
        attritionRate: averageHeadcount && averageHeadcount > 0
          ? Number(((rows.length / averageHeadcount) * 100).toFixed(2))
          : null,
      },
      trend,
      reasons: [...reasonCounts.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label)),
    };
  }

  async getFilterOptions(accountId: string, input: AttritionFilterDto = {}) {
    return (await this.getDashboard(accountId, input)).filterOptions;
  }

  private buildFilterOptions(
    rows: ClassifiedAttritionRecord[],
    filters: NormalizedAttritionFilters,
  ) {
    type FilterKey = 'year' | 'separationType' | 'reasonForAction' | 'range' | 'orgUnit';
    const matchesExcept = (row: ClassifiedAttritionRecord, omitted: FilterKey) =>
      row.lwd_year !== null
      && (omitted === 'year' || filters.years.includes(row.lwd_year))
      && (omitted === 'separationType' || !filters.separationTypes.length || filters.separationTypes.includes(row.separationType))
      && (omitted === 'reasonForAction' || !filters.reasonsForAction.length || filters.reasonsForAction.some((reason) => normalizedKey(row.reason_for_action) === normalizedKey(reason)))
      && (omitted === 'range' || !filters.ranges.length || filters.ranges.some((range) => normalizedKey(row.range) === normalizedKey(range)))
      && (omitted === 'orgUnit' || !filters.orgUnits.length || filters.orgUnits.some((orgUnit) => normalizedKey(row.org_unit) === normalizedKey(orgUnit)));
    return {
      year: [...new Set(rows.filter((row) => matchesExcept(row, 'year'))
        .flatMap((row) => row.lwd_year === null ? [] : [String(row.lwd_year)]))]
        .sort((left, right) => Number(right) - Number(left)),
      separationType: separationTypes.filter((type) => rows.some((row) =>
        matchesExcept(row, 'separationType') && row.separationType === type,
      )),
      reasonForAction: sortValues(rows.filter((row) => matchesExcept(row, 'reasonForAction'))
        .map((row) => row.reason_for_action).filter(Boolean)),
      range: sortValues(rows.filter((row) => matchesExcept(row, 'range'))
        .map((row) => row.range).filter(Boolean)),
      orgUnit: sortValues(rows.filter((row) => matchesExcept(row, 'orgUnit'))
        .map((row) => row.org_unit).filter(Boolean)),
    };
  }

  private matches(row: ClassifiedAttritionRecord, filters: NormalizedAttritionFilters): boolean {
    return row.lwd_year !== null && filters.years.includes(row.lwd_year)
      && (!filters.separationTypes.length || filters.separationTypes.includes(row.separationType))
      && (!filters.reasonsForAction.length || filters.reasonsForAction.some((reason) => normalizedKey(row.reason_for_action) === normalizedKey(reason)))
      && (!filters.orgUnits.length || filters.orgUnits.some((orgUnit) => normalizedKey(row.org_unit) === normalizedKey(orgUnit)))
      && (!filters.ranges.length || filters.ranges.some((range) => normalizedKey(row.range) === normalizedKey(range)));
  }

  private async getMonthlyHeadcount(
    accountId: string,
    filters: NormalizedAttritionFilters,
  ): Promise<Map<number, number>> {
    const result = await this.database.query<{ month: number; headcount: string }>(
      `WITH access_rows AS (
         SELECT role,
                UPPER(REGEXP_REPLACE(BTRIM(COALESCE(assigned_range, '')), '[[:space:]]+', ' ', 'g')) AS range_key,
                UPPER(REGEXP_REPLACE(BTRIM(COALESCE(assigned_org_unit, '')), '[[:space:]]+', ' ', 'g')) AS org_unit_key
         FROM public.master_access WHERE account_id = $1::UUID
       ), access_flags AS (
         SELECT COALESCE(BOOL_OR(role IN ('hrbp', 'admin')), FALSE) AS unrestricted FROM access_rows
       ), allowed_ranges AS (
         SELECT DISTINCT range_key FROM access_rows WHERE role = 'range_head' AND range_key <> ''
       ), allowed_tuples AS (
         SELECT DISTINCT range_key, org_unit_key FROM access_rows scoped
         WHERE role IN ('department_head', 'sub_department_head')
           AND range_key <> '' AND org_unit_key <> ''
           AND NOT EXISTS (
             SELECT 1 FROM allowed_ranges allowed WHERE allowed.range_key = scoped.range_key
           )
       ), selected AS (
         SELECT month.reporting_month, month.total_headcount::BIGINT AS headcount
         FROM public.employee_headcount_months month CROSS JOIN access_flags flags
         WHERE flags.unrestricted AND $3::TEXT[] IS NULL AND $4::TEXT[] IS NULL
           AND EXTRACT(YEAR FROM month.reporting_month)::INTEGER = ANY($2::INTEGER[])
         UNION ALL
         SELECT item.reporting_month, item.headcount::BIGINT
         FROM public.employee_headcount_by_range item CROSS JOIN access_flags flags
         WHERE flags.unrestricted AND $3::TEXT[] IS NOT NULL AND $4::TEXT[] IS NULL
           AND item.range_key = ANY($3::TEXT[]) AND EXTRACT(YEAR FROM item.reporting_month)::INTEGER = ANY($2::INTEGER[])
         UNION ALL
         SELECT item.reporting_month, item.headcount::BIGINT
         FROM public.employee_headcount_by_org_unit item CROSS JOIN access_flags flags
         WHERE flags.unrestricted AND $3::TEXT[] IS NULL AND $4::TEXT[] IS NOT NULL
           AND item.org_unit_key = ANY($4::TEXT[]) AND EXTRACT(YEAR FROM item.reporting_month)::INTEGER = ANY($2::INTEGER[])
         UNION ALL
         SELECT item.reporting_month, item.headcount::BIGINT
         FROM public.employee_headcount_by_range_org_unit item CROSS JOIN access_flags flags
         WHERE flags.unrestricted AND $3::TEXT[] IS NOT NULL AND $4::TEXT[] IS NOT NULL
           AND item.range_key = ANY($3::TEXT[]) AND item.org_unit_key = ANY($4::TEXT[])
           AND EXTRACT(YEAR FROM item.reporting_month)::INTEGER = ANY($2::INTEGER[])
         UNION ALL
         SELECT item.reporting_month, item.headcount::BIGINT
         FROM public.employee_headcount_by_range item
         JOIN allowed_ranges allowed ON allowed.range_key = item.range_key
         CROSS JOIN access_flags flags
         WHERE NOT flags.unrestricted AND $4::TEXT[] IS NULL
           AND ($3::TEXT[] IS NULL OR item.range_key = ANY($3::TEXT[]))
           AND EXTRACT(YEAR FROM item.reporting_month)::INTEGER = ANY($2::INTEGER[])
         UNION ALL
         SELECT item.reporting_month, item.headcount::BIGINT
         FROM public.employee_headcount_by_range_org_unit item
         JOIN allowed_ranges allowed ON allowed.range_key = item.range_key
         CROSS JOIN access_flags flags
         WHERE NOT flags.unrestricted AND $4::TEXT[] IS NOT NULL
           AND item.org_unit_key = ANY($4::TEXT[]) AND ($3::TEXT[] IS NULL OR item.range_key = ANY($3::TEXT[]))
           AND EXTRACT(YEAR FROM item.reporting_month)::INTEGER = ANY($2::INTEGER[])
         UNION ALL
         SELECT item.reporting_month, item.headcount::BIGINT
         FROM public.employee_headcount_by_range_org_unit item
         JOIN allowed_tuples allowed
           ON allowed.range_key = item.range_key AND allowed.org_unit_key = item.org_unit_key
         CROSS JOIN access_flags flags
         WHERE NOT flags.unrestricted
           AND ($3::TEXT[] IS NULL OR item.range_key = ANY($3::TEXT[]))
           AND ($4::TEXT[] IS NULL OR item.org_unit_key = ANY($4::TEXT[]))
             AND EXTRACT(YEAR FROM item.reporting_month)::INTEGER = ANY($2::INTEGER[])
       )
           SELECT EXTRACT(MONTH FROM reporting_month)::INTEGER AS month,
              SUM(headcount)::TEXT AS headcount
           FROM selected GROUP BY EXTRACT(MONTH FROM reporting_month) ORDER BY month`,
      [
        accountId,
        filters.years,
        filters.ranges.length ? filters.ranges.map(normalizedKey) : null,
        filters.orgUnits.length ? filters.orgUnits.map(normalizedKey) : null,
      ],
    );
    return new Map(result.rows.map((row) => [
      row.month,
      Number(row.headcount),
    ]));
  }

  private normalizeFilters(filters: AttritionFilterDto): NormalizedAttritionFilters {
    const normalizeMany = (value: unknown, label: string): string[] => {
      if (value === undefined || value === '') return [];
      const values = Array.isArray(value) ? value : [value];
      if (values.length > 100 || values.some((item) => typeof item !== 'string' || item.length > 200)) {
        throw new BadRequestException(`${label} filter is invalid`);
      }
      return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
    };
    const yearValues = normalizeMany(filters.year, 'Year');
    const years = (yearValues.length ? yearValues : [String(new Date().getUTCFullYear())]).map(Number);
    if (years.some((year) => !Number.isInteger(year) || year < 2000 || year > 9999)) {
      throw new BadRequestException('Year filter is invalid');
    }
    const selectedTypes = normalizeMany(filters.separationType, 'Separation type');
    if (selectedTypes.some((type) => !separationTypes.includes(type as SeparationType))) {
      throw new BadRequestException('Separation type filter is invalid');
    }
    return {
      years,
      separationTypes: selectedTypes,
      orgUnits: normalizeMany(filters.orgUnit, 'Organizational unit'),
      ranges: normalizeMany(filters.range, 'Range'),
      reasonsForAction: normalizeMany(filters.reasonForAction, 'Reason for action'),
    };
  }
}