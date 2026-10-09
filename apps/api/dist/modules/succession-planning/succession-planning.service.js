"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessionPlanningService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
const filterKeys = [
    'functionName',
    'orgUnit',
    'range',
    'location',
    'gender',
    'directOrIndirect',
];
let SuccessionPlanningService = class SuccessionPlanningService {
    database;
    constructor(database) {
        this.database = database;
    }
    async getRegister(accountId, input = {}) {
        return this.queryRegister(this.database, accountId, this.normalizeFilters(input));
    }
    async getHistoryState() {
        const result = await this.database.query(`
      SELECT COALESCE((
        SELECT ARRAY_AGG(TO_CHAR(reporting_month, 'YYYY-MM') ORDER BY reporting_month DESC)
        FROM public.dashboard_json_snapshots
        WHERE dashboard_key = 'succession-planning' AND is_active
      ), ARRAY[]::TEXT[]) AS snapshot_months
    `);
        return { snapshotMonths: result.rows[0]?.snapshot_months ?? [] };
    }
    async getSnapshot(reportingMonthInput) {
        const reportingMonth = this.normalizeReportingMonth(reportingMonthInput);
        const result = await this.database.query(`SELECT payload
       FROM public.dashboard_json_snapshots
       WHERE dashboard_key = 'succession-planning'
         AND reporting_month = $1::DATE AND is_active`, [reportingMonth]);
        if (!result.rows[0])
            throw new common_1.NotFoundException('Succession Planning snapshot was not found');
        return result.rows[0].payload;
    }
    async publishSnapshot(reportingMonthInput, accountId) {
        const reportingMonth = this.normalizeReportingMonth(reportingMonthInput);
        return this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('succession_planning_snapshot'))`);
            const emptyFilters = {
                functionName: [],
                orgUnit: [],
                range: [],
                location: [],
                gender: [],
                directOrIndirect: [],
            };
            const dashboard = await this.queryRegister(client, accountId, emptyFilters);
            const snapshot = await client.query(`WITH next_version AS (
           SELECT COALESCE(MAX(version), 0) + 1 AS version
           FROM public.dashboard_json_snapshots
           WHERE dashboard_key = 'succession-planning'
             AND reporting_month = $1::DATE
         ), deactivate AS (
           UPDATE public.dashboard_json_snapshots
           SET is_active = FALSE
           WHERE dashboard_key = 'succession-planning'
             AND reporting_month = $1::DATE AND is_active
           RETURNING 1
         )
         INSERT INTO public.dashboard_json_snapshots (
           dashboard_key, reporting_month, version, payload, checksum,
           created_by, is_active
         )
         SELECT 'succession-planning', $1::DATE, next_version.version,
                $2::JSONB, MD5(($2::JSONB)::TEXT), $3::UUID, TRUE
         FROM next_version
         RETURNING id::TEXT`, [reportingMonth, JSON.stringify(dashboard), accountId]);
            const snapshotId = snapshot.rows[0]?.id;
            if (!snapshotId)
                throw new common_1.ConflictException('Snapshot could not be saved');
            const verification = await client.query(`SELECT checksum = MD5(payload::TEXT) AS verified
         FROM public.dashboard_json_snapshots WHERE id = $1::BIGINT`, [snapshotId]);
            if (!verification.rows[0]?.verified)
                throw new common_1.ConflictException('Snapshot could not be verified');
            return { reportingMonth: reportingMonth.slice(0, 7) };
        });
    }
    async queryRegister(queryable, accountId, filters) {
        const [state, result] = await Promise.all([
            queryable.query(`SELECT state.revision::TEXT AS revision,
                latest.file_name,
                latest.imported_at::TEXT AS imported_at
         FROM public.succession_planning_state state
         LEFT JOIN LATERAL (
           SELECT file_name, imported_at
           FROM public.succession_planning_imports
           ORDER BY imported_at DESC, id DESC LIMIT 1
         ) latest ON TRUE
         WHERE state.singleton = TRUE`),
            queryable.query(`SELECT row.id::TEXT,
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
                row.successor2_9_box_rating, row.successor2_idp_status,
                COALESCE(people.filter_employees, '[]'::JSONB) AS filter_employees
         FROM public.succession_planning_rows row
         LEFT JOIN LATERAL (
           SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
             'functionName', COALESCE(BTRIM(employee.function), ''),
             'orgUnit', COALESCE(BTRIM(employee.organizational_unit), ''),
             'range', COALESCE(BTRIM(employee.range), ''),
             'location', COALESCE(BTRIM(employee.location), ''),
             'gender', COALESCE(BTRIM(employee.gender_key), ''),
             'directOrIndirect', COALESCE(BTRIM(employee.direct_or_indirect), '')
           )) AS filter_employees
           FROM public.employee_namelist employee
           WHERE employee.pers_no::TEXT = ANY(
             REGEXP_SPLIT_TO_ARRAY(row.incumbent_pers_no, '[^0-9]+')
           )
         ) people ON TRUE
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
         ORDER BY row.area, row.position_jd_id, row.id`, [accountId]),
        ]);
        const authorizedRows = result.rows;
        const rows = authorizedRows.filter((row) => filterKeys.every((key) => {
            const selected = filters[key];
            return (selected.length === 0
                || row.filter_employees.some((employee) => selected.includes(employee[key])));
        }));
        const filterOptions = Object.fromEntries(filterKeys.map((optionKey) => {
            const values = authorizedRows.flatMap((row) => row.filter_employees
                .filter((employee) => filterKeys.every((filterKey) => filterKey === optionKey
                || filters[filterKey].length === 0
                || filters[filterKey].includes(employee[filterKey])))
                .map((employee) => employee[optionKey])
                .filter(Boolean));
            return [
                optionKey,
                [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
            ];
        }));
        return {
            revision: state.rows[0]?.revision ?? '0',
            fileName: state.rows[0]?.file_name ?? null,
            importedAt: state.rows[0]?.imported_at ?? null,
            rows: rows.map(({ filter_employees: _filterEmployees, ...row }) => row),
            filterOptions,
        };
    }
    normalizeFilters(filters) {
        const normalizeMany = (value, label) => {
            if (value === undefined || value === '')
                return [];
            const values = Array.isArray(value) ? value : [value];
            if (values.some((item) => typeof item !== 'string' || item.length > 200))
                throw new common_1.BadRequestException(`${label} filter is invalid`);
            return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
        };
        return {
            functionName: normalizeMany(filters.functionName, 'Function'),
            orgUnit: normalizeMany(filters.orgUnit, 'Organizational unit'),
            range: normalizeMany(filters.range, 'Range'),
            location: normalizeMany(filters.location, 'Location'),
            gender: normalizeMany(filters.gender, 'Gender'),
            directOrIndirect: normalizeMany(filters.directOrIndirect, 'Direct or indirect'),
        };
    }
    normalizeReportingMonth(value) {
        if (typeof value !== 'string'
            || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
            throw new common_1.BadRequestException('Reporting month must use YYYY-MM format');
        if (value >= new Date().toISOString().slice(0, 7))
            throw new common_1.BadRequestException('Historical reporting month must be earlier than the current month');
        return `${value}-01`;
    }
};
exports.SuccessionPlanningService = SuccessionPlanningService;
exports.SuccessionPlanningService = SuccessionPlanningService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], SuccessionPlanningService);
//# sourceMappingURL=succession-planning.service.js.map