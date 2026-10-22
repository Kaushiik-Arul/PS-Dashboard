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
exports.OrgStructureImportRepository = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../../database/database.service");
let OrgStructureImportRepository = class OrgStructureImportRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async createPreview(file, rows, actor) {
        const hash = (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex');
        return this.database.transaction(async (client) => {
            const result = await client.query(`INSERT INTO public.org_structure_previews (uploaded_by, file_name, file_hash, total_rows)
         VALUES ($1, $2, $3, $4) RETURNING preview_id`, [actor, file.originalname, hash, rows.length]);
            const id = result.rows[0].preview_id;
            for (let start = 0; start < rows.length; start += 500) {
                const batch = rows.slice(start, start + 500).map((row) => ({ row_number: row.rowNumber, row_data: row.values }));
                await client.query(`INSERT INTO public.org_structure_preview_rows (preview_id, row_number, row_data)
           SELECT $1, item.row_number, item.row_data
           FROM JSONB_TO_RECORDSET($2::JSONB) AS item(row_number INTEGER, row_data JSONB)`, [id, JSON.stringify(batch)]);
            }
            return { id };
        });
    }
    async getPreview(id, actor, page) {
        const found = await this.database.query(`SELECT preview_id, file_name, file_hash, total_rows, status, created_at
       FROM public.org_structure_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP`, [id, actor]);
        const preview = found.rows[0];
        if (!preview)
            throw new Error('PREVIEW_NOT_FOUND');
        const [rows, existing] = await Promise.all([
            this.database.query(`SELECT row_number, row_data FROM public.org_structure_preview_rows
         WHERE preview_id = $1 ORDER BY row_number LIMIT 25 OFFSET $2`, [id, (page - 1) * 25]),
            this.database.query('SELECT COUNT(*)::TEXT AS count FROM public.org_structure_rows'),
        ]);
        return {
            id,
            fileName: preview.file_name,
            totalRows: preview.total_rows,
            existingRows: Number(existing.rows[0].count),
            filteredRows: preview.total_rows,
            page,
            rows: rows.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data })),
        };
    }
    async updateRow(id, actor, rowNumber, values) {
        await this.database.transaction(async (client) => {
            await this.lockPreview(client, id, actor);
            const updated = await client.query(`UPDATE public.org_structure_preview_rows SET row_data = $3::JSONB
         WHERE preview_id = $1 AND row_number = $2`, [id, rowNumber, JSON.stringify(values)]);
            if (!updated.rowCount)
                throw new Error('ROW_NOT_FOUND');
        });
    }
    async deleteRow(id, actor, rowNumber) {
        await this.database.transaction(async (client) => {
            const preview = await this.lockPreview(client, id, actor);
            if (preview.total_rows <= 1)
                throw new Error('LAST_PREVIEW_ROW');
            const deleted = await client.query('DELETE FROM public.org_structure_preview_rows WHERE preview_id = $1 AND row_number = $2', [id, rowNumber]);
            if (!deleted.rowCount)
                throw new Error('ROW_NOT_FOUND');
            await client.query('UPDATE public.org_structure_previews SET total_rows = total_rows - 1 WHERE preview_id = $1', [id]);
        });
    }
    async cancel(id, actor) {
        const result = await this.database.query(`DELETE FROM public.org_structure_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'`, [id, actor]);
        return (result.rowCount ?? 0) > 0;
    }
    async commit(id, actor, confirmed) {
        return this.database.transaction(async (client) => {
            await client.query("SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('org_structure_replace'))");
            const found = await client.query(`SELECT preview_id, file_name, file_hash, total_rows, status, created_at
         FROM public.org_structure_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [id, actor]);
            const preview = found.rows[0];
            if (!preview)
                throw new Error('PREVIEW_NOT_FOUND');
            if (!confirmed)
                throw new Error('CONFIRM_REQUIRED');
            const newer = await client.query('SELECT EXISTS (SELECT 1 FROM public.org_structure_imports WHERE imported_at > $1) AS exists', [preview.created_at]);
            if (newer.rows[0].exists)
                throw new Error('STALE_PREVIEW');
            const existing = await client.query('SELECT COUNT(*)::TEXT AS count FROM public.org_structure_rows');
            const replacedRows = Number(existing.rows[0].count);
            const imported = await client.query(`INSERT INTO public.org_structure_imports (file_name, file_hash, row_count, replaced_rows, imported_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING import_id`, [preview.file_name, preview.file_hash, preview.total_rows, replacedRows, actor]);
            const importId = imported.rows[0].import_id;
            await client.query('DELETE FROM public.org_structure_rows');
            const inserted = await client.query(`INSERT INTO public.org_structure_rows (
           import_id, source_row_number, role_title, reporting_to, jd_id, career_level, layer, order_by, is_active,
           grade, function
         )
         SELECT $2, r.row_number, BTRIM(COALESCE(v.role_title, '')), BTRIM(COALESCE(v.reporting_to, '')),
           BTRIM(COALESCE(v.jd_id, '')), BTRIM(COALESCE(v.career_level, '')),
           BTRIM(COALESCE(v.layer, '')),
           CASE WHEN BTRIM(v.order_by) ~ '^-?\\d{1,9}$' THEN BTRIM(v.order_by)::INTEGER END,
           LOWER(BTRIM(COALESCE(v.is_active, ''))) IN ('yes', 'true', '1', 'y'),
           BTRIM(COALESCE(v.grade, '')), BTRIM(COALESCE(v.function, ''))
         FROM public.org_structure_preview_rows r
         CROSS JOIN LATERAL JSONB_TO_RECORD(r.row_data) AS v(
           role_title TEXT, reporting_to TEXT, jd_id TEXT, career_level TEXT,
           layer TEXT, order_by TEXT, is_active TEXT, grade TEXT, function TEXT
         )
         WHERE r.preview_id = $1 ORDER BY r.row_number`, [id, importId]);
            if (inserted.rowCount !== preview.total_rows)
                throw new Error('ROW_COUNT_MISMATCH');
            await client.query("UPDATE public.org_structure_previews SET status = 'committed' WHERE preview_id = $1", [id]);
            return { importedRows: inserted.rowCount, replacedRows };
        });
    }
    async list() {
        const result = await this.database.query(`SELECT r.id::TEXT AS id, r.source_row_number AS "sourceRowNumber", r.role_title AS "roleTitle",
         r.reporting_to AS "reportingTo", r.jd_id AS "jdId", r.career_level AS "careerLevel",
        r.layer, r.grade, r.function, r.order_by AS "orderBy", r.is_active AS "isActive",
        i.imported_at AS "importedAt"
       FROM public.org_structure_rows r
       JOIN public.org_structure_imports i ON i.import_id = r.import_id
       ORDER BY r.order_by ASC NULLS LAST, LOWER(r.role_title), r.source_row_number`);
        return result.rows;
    }
    async lockPreview(client, id, actor) {
        const result = await client.query(`SELECT total_rows FROM public.org_structure_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [id, actor]);
        if (!result.rows.length)
            throw new Error('PREVIEW_NOT_FOUND');
        return result.rows[0];
    }
};
exports.OrgStructureImportRepository = OrgStructureImportRepository;
exports.OrgStructureImportRepository = OrgStructureImportRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], OrgStructureImportRepository);
//# sourceMappingURL=org-structure-import.repository.js.map