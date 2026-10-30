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
exports.MrmCalculationRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
function monthDate(month) {
    return `${month}-01`;
}
let MrmCalculationRepository = class MrmCalculationRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getSourceStatus(dataMonth, executor = this.database) {
        const result = await executor.query(`SELECT COALESCE((
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
       ) AS snapshot_available`, [monthDate(dataMonth)]);
        const status = result.rows[0];
        return {
            available: Boolean(status?.live_available || status?.history_available || status?.snapshot_available),
            source: status?.live_available
                ? 'live'
                : status?.history_available
                    ? 'history'
                    : status?.snapshot_available
                        ? 'snapshot'
                        : null,
        };
    }
    async getEmployees(dataMonth, accountId, source, executor = this.database) {
        const table = source === 'live'
            ? 'public.employee_namelist'
            : 'public.employee_namelist_monthly';
        const monthPredicate = source === 'live' ? '' : 'AND employee.reporting_month = $1::date';
        const result = await executor.query(`SELECT COALESCE(employee.range, '') AS range,
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
         )`, [monthDate(dataMonth), accountId]);
        return result.rows;
    }
    async getAttrition(dataMonth, accountId, executor = this.database) {
        const result = await executor.query(`SELECT COALESCE(row.range, '') AS range,
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
         )`, [monthDate(dataMonth), accountId]);
        return result.rows;
    }
    async getSnapshotBuckets(dataMonth, accountId, executor = this.database) {
        const result = await executor.query(`SELECT bucket.metric_key,
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
       GROUP BY bucket.metric_key ORDER BY bucket.metric_key`, [monthDate(dataMonth), accountId]);
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
    async replaceMonthlySnapshot(dataMonth, accountId, buckets, executor) {
        const sourceImport = await executor.query(`SELECT MAX(source_import_id)::text AS source_import_id
       FROM public.employee_namelist_monthly
       WHERE reporting_month = $1::date`, [monthDate(dataMonth)]);
        await executor.query(`DELETE FROM public.mrm_monthly_snapshots WHERE data_month = $1::date`, [monthDate(dataMonth)]);
        await executor.query(`INSERT INTO public.mrm_monthly_snapshots (
         data_month, source_import_id, created_by
       ) VALUES ($1::date, $2::bigint, $3::uuid)`, [monthDate(dataMonth), sourceImport.rows[0]?.source_import_id ?? null, accountId]);
        for (const bucket of buckets) {
            await executor.query(`INSERT INTO public.mrm_monthly_metric_snapshots (
           data_month, metric_key, range_key, org_unit_key,
           numerator, denominator, quality_count
         ) VALUES ($1::date, $2, $3, $4, $5, $6, $7)`, [monthDate(dataMonth), bucket.metricKey, bucket.rangeKey, bucket.orgUnitKey,
                bucket.numerator, bucket.denominator, bucket.qualityCount]);
        }
    }
};
exports.MrmCalculationRepository = MrmCalculationRepository;
exports.MrmCalculationRepository = MrmCalculationRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], MrmCalculationRepository);
//# sourceMappingURL=mrm-calculation.repository.js.map