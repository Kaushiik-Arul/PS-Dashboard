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
exports.EmployeeJdMovementsRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../../database/database.service");
const predicate = `WHERE ($1::TEXT = '' OR movement.pers_no::TEXT ILIKE '%' || $1 || '%'
    OR employee.personnel_number ILIKE '%' || $1 || '%')
  AND ($2::TEXT = '' OR movement.source = $2)
  AND ($3::DATE IS NULL OR movement.effective_date >= $3)
  AND ($4::DATE IS NULL OR movement.effective_date <= $4)
  AND ($5::TEXT = '' OR COALESCE(movement.old_role_title, '') ILIKE '%' || $5 || '%'
    OR COALESCE(movement.new_role_title, '') ILIKE '%' || $5 || '%')`;
let EmployeeJdMovementsRepository = class EmployeeJdMovementsRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list(filters, page, pageSize) {
        const values = [filters.search, filters.source, filters.fromDate, filters.toDate, filters.role];
        const [items, count] = await Promise.all([
            this.database.query(`SELECT movement.movement_id, movement.pers_no::TEXT, employee.personnel_number,
                movement.effective_date, movement.old_jd_id, movement.old_role_title,
                movement.new_jd_id, movement.new_role_title, movement.source,
                COALESCE(account.display_name, movement.changed_by_account_id::TEXT, 'System') AS changed_by,
                movement.occurred_at
         FROM public.employee_jd_movements movement
         LEFT JOIN public.employee_namelist employee ON employee.pers_no = movement.pers_no
         LEFT JOIN public.auth_accounts account ON account.account_id = movement.changed_by_account_id
         ${predicate}
         ORDER BY movement.effective_date DESC, movement.occurred_at DESC
         LIMIT $6 OFFSET $7`, [...values, pageSize, (page - 1) * pageSize]),
            this.database.query(`SELECT COUNT(*)::TEXT AS count
         FROM public.employee_jd_movements movement
         LEFT JOIN public.employee_namelist employee ON employee.pers_no = movement.pers_no
         ${predicate}`, values),
        ]);
        return {
            items: items.rows.map((row) => ({
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
};
exports.EmployeeJdMovementsRepository = EmployeeJdMovementsRepository;
exports.EmployeeJdMovementsRepository = EmployeeJdMovementsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EmployeeJdMovementsRepository);
//# sourceMappingURL=employee-jd-movements.repository.js.map