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
exports.TalentPipelineRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
const talent_pipeline_mapper_1 = require("./talent-pipeline.mapper");
let TalentPipelineRepository = class TalentPipelineRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getTalentPipeline(filters, accountId) {
        return (0, talent_pipeline_mapper_1.mapTalentPipelineResponse)(await this.queryDashboard(filters, accountId, null));
    }
    async getHistoryState() {
        const result = await this.database.query(`
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
    async getSnapshot(reportingMonth) {
        const result = await this.database.query(`SELECT payload AS dashboard
       FROM public.dashboard_json_snapshots
       WHERE dashboard_key = 'talent-pipeline'
         AND reporting_month = $1::date AND is_active`, [reportingMonth]);
        return result.rows[0]
            ? (0, talent_pipeline_mapper_1.mapTalentPipelineResponse)(result.rows[0].dashboard)
            : null;
    }
    async publishSnapshot(accountId, reportingMonth) {
        return this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('talent_pipeline_snapshot'))`);
            const emptyFilters = {
                functionName: [],
                orgUnit: [],
                range: [],
                location: [],
                gender: [],
                directOrIndirect: [],
            };
            const dashboard = await this.queryDashboard(emptyFilters, accountId, reportingMonth, client);
            const snapshot = await client.query(`WITH next_version AS (
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
         RETURNING id::text`, [reportingMonth, JSON.stringify(dashboard), accountId]);
            const snapshotId = snapshot.rows[0]?.id;
            if (!snapshotId)
                throw new Error('SNAPSHOT_VERIFICATION_FAILED');
            const verification = await client.query(`SELECT checksum = MD5(payload::text) AS verified
         FROM public.dashboard_json_snapshots WHERE id = $1::bigint`, [snapshotId]);
            if (!verification.rows[0]?.verified)
                throw new Error('SNAPSHOT_VERIFICATION_FAILED');
            return reportingMonth.slice(0, 7);
        });
    }
    async queryDashboard(filters, accountId, reportingMonth, client = this.database) {
        const result = await client.query(`
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
      ),
      scoped_workforce AS (
        SELECT COUNT(*)::INTEGER AS headcount
        FROM public.employee_namelist e
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
          AND (COALESCE(CARDINALITY($1::TEXT[]), 0) = 0 OR BTRIM(e.function) = ANY($1::TEXT[]))
          AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR BTRIM(e.organizational_unit) = ANY($2::TEXT[]))
          AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR BTRIM(e.range) = ANY($3::TEXT[]))
          AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR BTRIM(e.location) = ANY($4::TEXT[]))
          AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR BTRIM(e.gender_key) = ANY($5::TEXT[]))
          AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY($6::TEXT[]))
      )
      SELECT JSONB_BUILD_OBJECT(
        'workforceHeadcount', (SELECT headcount FROM scoped_workforce),
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
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR e.org_unit = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR e.range_name = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR e.location_name = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR e.gender_name = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR e.direct_or_indirect = ANY($6::TEXT[]))
            ORDER BY e.function_name
          )),
          'orgUnit', TO_JSONB(ARRAY(
            SELECT DISTINCT e.org_unit FROM filter_employees e
            WHERE e.org_unit IS NOT NULL
              AND (COALESCE(CARDINALITY($1::TEXT[]), 0) = 0 OR e.function_name = ANY($1::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR e.range_name = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR e.location_name = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR e.gender_name = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR e.direct_or_indirect = ANY($6::TEXT[]))
            ORDER BY e.org_unit
          )),
          'range', TO_JSONB(ARRAY(
            SELECT DISTINCT e.range_name FROM filter_employees e
            WHERE e.range_name IS NOT NULL
              AND (COALESCE(CARDINALITY($1::TEXT[]), 0) = 0 OR e.function_name = ANY($1::TEXT[]))
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR e.org_unit = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR e.location_name = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR e.gender_name = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR e.direct_or_indirect = ANY($6::TEXT[]))
            ORDER BY e.range_name
          )),
          'location', TO_JSONB(ARRAY(
            SELECT DISTINCT e.location_name FROM filter_employees e
            WHERE e.location_name IS NOT NULL
              AND (COALESCE(CARDINALITY($1::TEXT[]), 0) = 0 OR e.function_name = ANY($1::TEXT[]))
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR e.org_unit = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR e.range_name = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR e.gender_name = ANY($5::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR e.direct_or_indirect = ANY($6::TEXT[]))
            ORDER BY e.location_name
          )),
          'gender', TO_JSONB(ARRAY(
            SELECT DISTINCT e.gender_name FROM filter_employees e
            WHERE e.gender_name IS NOT NULL
              AND (COALESCE(CARDINALITY($1::TEXT[]), 0) = 0 OR e.function_name = ANY($1::TEXT[]))
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR e.org_unit = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR e.range_name = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR e.location_name = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($6::TEXT[]), 0) = 0 OR e.direct_or_indirect = ANY($6::TEXT[]))
            ORDER BY e.gender_name
          )),
          'directOrIndirect', TO_JSONB(ARRAY(
            SELECT DISTINCT e.direct_or_indirect FROM filter_employees e
            WHERE e.direct_or_indirect IS NOT NULL
              AND (COALESCE(CARDINALITY($1::TEXT[]), 0) = 0 OR e.function_name = ANY($1::TEXT[]))
              AND (COALESCE(CARDINALITY($2::TEXT[]), 0) = 0 OR e.org_unit = ANY($2::TEXT[]))
              AND (COALESCE(CARDINALITY($3::TEXT[]), 0) = 0 OR e.range_name = ANY($3::TEXT[]))
              AND (COALESCE(CARDINALITY($4::TEXT[]), 0) = 0 OR e.location_name = ANY($4::TEXT[]))
              AND (COALESCE(CARDINALITY($5::TEXT[]), 0) = 0 OR e.gender_name = ANY($5::TEXT[]))
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
};
exports.TalentPipelineRepository = TalentPipelineRepository;
exports.TalentPipelineRepository = TalentPipelineRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TalentPipelineRepository);
//# sourceMappingURL=talent-pipeline.repository.js.map