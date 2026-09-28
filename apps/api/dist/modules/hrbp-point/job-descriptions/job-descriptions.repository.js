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
exports.JobDescriptionsRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../../database/database.service");
function mapRow(row) {
    return {
        id: row.job_description_id,
        jdId: row.jd_id,
        roleTitle: row.role_title,
        updatedAt: row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : new Date(row.updated_at).toISOString(),
    };
}
const selectedColumns = 'job_description_id, jd_id, role_title, updated_at';
let JobDescriptionsRepository = class JobDescriptionsRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list(search, page, pageSize) {
        const predicate = `WHERE ($1::TEXT = ''
      OR STRPOS(LOWER(jd_id), LOWER($1)) > 0
      OR STRPOS(LOWER(role_title), LOWER($1)) > 0)`;
        const [items, count] = await Promise.all([
            this.database.query(`SELECT ${selectedColumns}
         FROM public.job_descriptions
         ${predicate}
         ORDER BY LOWER(jd_id), jd_id
         LIMIT $2 OFFSET $3`, [search, pageSize, (page - 1) * pageSize]),
            this.database.query(`SELECT COUNT(*)::TEXT AS count
         FROM public.job_descriptions
         ${predicate}`, [search]),
        ]);
        return {
            items: items.rows.map(mapRow),
            total: Number(count.rows[0]?.count ?? 0),
            page,
            pageSize,
            search,
        };
    }
    async findBySuffix(suffix) {
        const result = await this.database.query(`SELECT ${selectedColumns}
       FROM public.job_descriptions
       WHERE RIGHT(jd_id, 3) = $1
       ORDER BY LOWER(jd_id), jd_id
       LIMIT 101`, [suffix]);
        return result.rows.map(mapRow);
    }
    create(input, actorAccountId) {
        return this.database.transaction(async (client) => {
            const result = await client.query(`INSERT INTO public.job_descriptions (
           jd_id, role_title, created_by_account_id, updated_by_account_id
         ) VALUES ($1, $2, $3, $3)
         RETURNING ${selectedColumns}`, [input.jdId, input.roleTitle, actorAccountId]);
            const created = mapRow(result.rows[0]);
            await this.audit(client, 'job_description_created', actorAccountId, { jobDescription: created });
            return created;
        });
    }
    importCsv(inputs, fileName, actorAccountId) {
        return this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('job_descriptions_import'))`);
            const existing = await client.query(`SELECT jd_id, role_title FROM public.job_descriptions
         WHERE jd_id = ANY($1::TEXT[])`, [inputs.map((input) => input.jdId)]);
            const existingTitles = new Map(existing.rows.map((row) => [row.jd_id, row.role_title]));
            const updated = inputs.filter((input) => {
                const existingTitle = existingTitles.get(input.jdId);
                return existingTitle !== undefined && existingTitle !== input.roleTitle;
            }).length;
            await client.query(`INSERT INTO public.job_descriptions (
           jd_id, role_title, created_by_account_id, updated_by_account_id
         )
         SELECT item.jd_id, item.role_title, $2, $2
         FROM JSONB_TO_RECORDSET($1::JSONB) AS item(jd_id TEXT, role_title TEXT)
         ON CONFLICT (jd_id) DO UPDATE SET
           role_title = EXCLUDED.role_title,
           updated_by_account_id = EXCLUDED.updated_by_account_id,
           updated_at = CURRENT_TIMESTAMP
         WHERE job_descriptions.role_title IS DISTINCT FROM EXCLUDED.role_title`, [JSON.stringify(inputs.map((input) => ({ jd_id: input.jdId, role_title: input.roleTitle }))), actorAccountId]);
            const summary = {
                totalRows: inputs.length,
                created: inputs.length - existingTitles.size,
                updated,
                unchanged: existingTitles.size - updated,
            };
            await this.audit(client, 'job_description_updated', actorAccountId, {
                operation: 'csv_import',
                fileName,
                ...summary,
            });
            return summary;
        });
    }
    update(id, input, actorAccountId) {
        return this.database.transaction(async (client) => {
            const previous = await this.findForUpdate(client, id);
            if (!previous)
                return null;
            const result = await client.query(`UPDATE public.job_descriptions
         SET jd_id = $2, role_title = $3, updated_by_account_id = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE job_description_id = $1
         RETURNING ${selectedColumns}`, [id, input.jdId, input.roleTitle, actorAccountId]);
            const updated = mapRow(result.rows[0]);
            await this.audit(client, 'job_description_updated', actorAccountId, {
                previous: mapRow(previous),
                jobDescription: updated,
            });
            return updated;
        });
    }
    delete(id, actorAccountId) {
        return this.database.transaction(async (client) => {
            const previous = await this.findForUpdate(client, id);
            if (!previous)
                return false;
            await client.query('DELETE FROM public.job_descriptions WHERE job_description_id = $1', [id]);
            await this.audit(client, 'job_description_deleted', actorAccountId, {
                jobDescription: mapRow(previous),
            });
            return true;
        });
    }
    async findForUpdate(client, id) {
        const result = await client.query(`SELECT ${selectedColumns}
       FROM public.job_descriptions
       WHERE job_description_id = $1
       FOR UPDATE`, [id]);
        return result.rows[0] ?? null;
    }
    audit(client, eventType, actorAccountId, details) {
        return client.query(`INSERT INTO public.security_audit_log (event_type, actor_account_id, event_details)
       VALUES ($1, $2, $3)`, [eventType, actorAccountId, details]);
    }
};
exports.JobDescriptionsRepository = JobDescriptionsRepository;
exports.JobDescriptionsRepository = JobDescriptionsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], JobDescriptionsRepository);
//# sourceMappingURL=job-descriptions.repository.js.map