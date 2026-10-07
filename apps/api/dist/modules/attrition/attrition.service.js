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
exports.AttritionService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
const filterKeys = ['orgUnit', 'range', 'gender'];
let AttritionService = class AttritionService {
    database;
    constructor(database) {
        this.database = database;
    }
    async getRegister(accountId, input = {}) {
        const filters = this.normalizeFilters(input);
        const [state, result] = await Promise.all([
            this.database.query(`SELECT state.revision::TEXT AS revision,
                latest.file_name,
                latest.imported_at::TEXT AS imported_at
         FROM public.attrition_state state
         LEFT JOIN LATERAL (
           SELECT file_name, imported_at
           FROM public.attrition_imports
           ORDER BY imported_at DESC, id DESC LIMIT 1
         ) latest ON TRUE
         WHERE state.singleton = TRUE`),
            this.database.query(`SELECT row.id::TEXT,
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
         ORDER BY row.lwd DESC NULLS LAST, row.pers_no, row.id`, [accountId]),
        ]);
        const authorizedRows = result.rows;
        const rows = authorizedRows.filter((row) => (!filters.orgUnit || row.org_unit === filters.orgUnit)
            && (!filters.range || row.range === filters.range)
            && (!filters.gender || row.gender_key === filters.gender));
        const filterOptions = Object.fromEntries(filterKeys.map((optionKey) => {
            const field = optionKey === 'orgUnit'
                ? 'org_unit'
                : optionKey === 'gender'
                    ? 'gender_key'
                    : 'range';
            const values = authorizedRows
                .filter((row) => (optionKey === 'orgUnit' || !filters.orgUnit || row.org_unit === filters.orgUnit)
                && (optionKey === 'range' || !filters.range || row.range === filters.range)
                && (optionKey === 'gender' || !filters.gender || row.gender_key === filters.gender))
                .map((row) => row[field])
                .filter(Boolean);
            return [
                optionKey,
                [...new Set(values)].sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
            ];
        }));
        return {
            revision: state.rows[0]?.revision ?? '0',
            fileName: state.rows[0]?.file_name ?? null,
            importedAt: state.rows[0]?.imported_at ?? null,
            rows,
            filterOptions,
        };
    }
    async getFilterOptions(accountId, input = {}) {
        return (await this.getRegister(accountId, input)).filterOptions;
    }
    normalizeFilters(filters) {
        const normalize = (value, label) => {
            if (value === undefined || value === '')
                return null;
            if (typeof value !== 'string' || value.length > 200)
                throw new common_1.BadRequestException(`${label} filter is invalid`);
            return value.trim() || null;
        };
        return {
            orgUnit: normalize(filters.orgUnit, 'Organizational unit'),
            range: normalize(filters.range, 'Range'),
            gender: normalize(filters.gender, 'Gender'),
        };
    }
};
exports.AttritionService = AttritionService;
exports.AttritionService = AttritionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AttritionService);
//# sourceMappingURL=attrition.service.js.map