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
    async getSourceStatus(dataMonth) {
        const result = await this.database.query(`SELECT COALESCE((
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
       ) AS history_available`, [monthDate(dataMonth)]);
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
    async getEmployees(dataMonth, accountId, source) {
        const table = source === 'live'
            ? 'public.employee_namelist'
            : 'public.employee_namelist_monthly';
        const monthPredicate = source === 'live' ? '' : 'AND employee.reporting_month = $1::date';
        const result = await this.database.query(`SELECT COALESCE(employee.range, '') AS range,
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
    async getAttrition(dataMonth, accountId) {
        const result = await this.database.query(`SELECT COALESCE(row.range, '') AS range,
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
};
exports.MrmCalculationRepository = MrmCalculationRepository;
exports.MrmCalculationRepository = MrmCalculationRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], MrmCalculationRepository);
//# sourceMappingURL=mrm-calculation.repository.js.map