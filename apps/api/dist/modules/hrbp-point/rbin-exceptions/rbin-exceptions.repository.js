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
exports.RbinExceptionsRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../../database/database.service");
const rbin_exceptions_types_1 = require("./rbin-exceptions.types");
const selectColumns = `exception.exception_id, exception.pers_no::text, exception.column_name,
  exception.fixed_value, exception.updated_at,
  COALESCE(account.display_name, exception.updated_by_account_id::text, 'System') AS updated_by`;
function mapRow(row) {
    return {
        id: row.exception_id,
        persNo: row.pers_no,
        columnName: row.column_name,
        columnLabel: rbin_exceptions_types_1.rbinExceptionColumnLabels[row.column_name],
        fixedValue: row.fixed_value,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
        updatedBy: row.updated_by ?? 'System',
    };
}
let RbinExceptionsRepository = class RbinExceptionsRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list(search, filter, page, pageSize) {
        const predicate = `WHERE ($1::text = '' OR exception.pers_no::text ILIKE '%' || $1 || '%'
      OR REPLACE(exception.column_name, '_', ' ') ILIKE '%' || $1 || '%'
      OR exception.fixed_value ILIKE '%' || $1 || '%')
      AND ($2::text = '' OR exception.column_name = $2)`;
        const [rows, count] = await Promise.all([
            this.database.query(`SELECT ${selectColumns}
         FROM public.rbin_employee_column_exceptions exception
         LEFT JOIN public.auth_accounts account ON account.account_id = exception.updated_by_account_id
         ${predicate}
         ORDER BY exception.pers_no, exception.column_name
         LIMIT $3 OFFSET $4`, [search, filter, pageSize, (page - 1) * pageSize]),
            this.database.query(`SELECT COUNT(*)::text AS count
         FROM public.rbin_employee_column_exceptions exception ${predicate}`, [search, filter]),
        ]);
        return { items: rows.rows.map(mapRow), total: Number(count.rows[0]?.count ?? 0), page, pageSize, search, filter };
    }
    createMany(persNo, rules, actorAccountId) {
        return this.database.transaction(async (client) => {
            const result = await client.query(`WITH inserted AS (
           INSERT INTO public.rbin_employee_column_exceptions (
             pers_no, column_name, fixed_value, created_by_account_id, updated_by_account_id
           )
           SELECT $1::bigint, rule.column_name, rule.fixed_value, $4::uuid, $4::uuid
           FROM UNNEST($2::text[], $3::text[]) AS rule(column_name, fixed_value)
           RETURNING *
         )
         SELECT ${selectColumns.replaceAll('exception.', 'inserted.')}
         FROM inserted
         LEFT JOIN public.auth_accounts account ON account.account_id = inserted.updated_by_account_id
         ORDER BY inserted.column_name`, [persNo, rules.map((rule) => rule.columnName), rules.map((rule) => rule.fixedValue), actorAccountId]);
            await this.audit(client, 'rbin_exception_created', actorAccountId, { persNo, rules });
            return result.rows.map(mapRow);
        });
    }
    update(id, input, actorAccountId) {
        return this.database.transaction(async (client) => {
            const previous = await client.query(`SELECT exception_id, pers_no::text, column_name, fixed_value, updated_at, NULL::text AS updated_by
         FROM public.rbin_employee_column_exceptions WHERE exception_id = $1 FOR UPDATE`, [id]);
            if (!previous.rows[0])
                return null;
            const result = await client.query(`WITH exception AS (
           UPDATE public.rbin_employee_column_exceptions
           SET pers_no = $2, column_name = $3, fixed_value = $4,
               updated_by_account_id = $5, updated_at = CURRENT_TIMESTAMP
           WHERE exception_id = $1 RETURNING *
         )
         SELECT ${selectColumns}
         FROM exception
         LEFT JOIN public.auth_accounts account ON account.account_id = exception.updated_by_account_id`, [id, input.persNo, input.columnName, input.fixedValue, actorAccountId]);
            await this.audit(client, 'rbin_exception_updated', actorAccountId, { id, previous: mapRow(previous.rows[0]), current: input });
            return result.rows[0] ? mapRow(result.rows[0]) : null;
        });
    }
    delete(id, actorAccountId) {
        return this.database.transaction(async (client) => {
            const result = await client.query(`DELETE FROM public.rbin_employee_column_exceptions WHERE exception_id = $1
         RETURNING exception_id, pers_no::text, column_name, fixed_value, updated_at, NULL::text AS updated_by`, [id]);
            if (!result.rows[0])
                return false;
            await this.audit(client, 'rbin_exception_deleted', actorAccountId, { exception: mapRow(result.rows[0]) });
            return true;
        });
    }
    audit(client, eventType, actorAccountId, details) {
        return client.query(`INSERT INTO public.security_audit_log (event_type, actor_account_id, event_details)
       VALUES ($1, $2, $3)`, [eventType, actorAccountId, details]);
    }
};
exports.RbinExceptionsRepository = RbinExceptionsRepository;
exports.RbinExceptionsRepository = RbinExceptionsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], RbinExceptionsRepository);
//# sourceMappingURL=rbin-exceptions.repository.js.map