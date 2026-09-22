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
exports.NamelistImportRepository = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../../database/database.service");
function mapMonth(value) {
    return value instanceof Date ? value.toISOString().slice(0, 7) : value.slice(0, 7);
}
let NamelistImportRepository = class NamelistImportRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async createPreview(actorAccountId, file, rows) {
        return this.database.transaction(async (client) => {
            await client.query(`DELETE FROM public.namelist_import_previews WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP`);
            const validRows = rows.filter((row) => row.issues.length === 0).length;
            const preview = await client.query(`INSERT INTO public.namelist_import_previews (
           uploaded_by, reporting_month, file_name, file_hash,
           total_rows, valid_rows, invalid_rows
         ) VALUES ($1, DATE_TRUNC('month', CURRENT_DATE)::date, $2, $3, $4, $5, $6)
         RETURNING preview_id`, [actorAccountId, file.originalname, (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex'), rows.length, validRows, rows.length - validRows]);
            const previewId = preview.rows[0].preview_id;
            for (let offset = 0; offset < rows.length; offset += 500) {
                const batch = rows.slice(offset, offset + 500).map((row) => ({
                    row_number: row.rowNumber,
                    row_data: row.values,
                    issues: row.issues,
                    is_valid: row.issues.length === 0,
                }));
                await client.query(`INSERT INTO public.namelist_import_preview_rows (preview_id, row_number, row_data, issues, is_valid)
           SELECT $1, item.row_number, item.row_data, item.issues, item.is_valid
           FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             row_number integer, row_data jsonb, issues jsonb, is_valid boolean
           )`, [previewId, JSON.stringify(batch)]);
            }
            return previewId;
        });
    }
    async getSummary(previewId, actorAccountId) {
        const preview = await this.database.query(`SELECT preview_id, file_name, reporting_month, total_rows, valid_rows, invalid_rows
       FROM public.namelist_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP`, [previewId, actorAccountId]);
        if (!preview.rows[0])
            return null;
        return this.buildSummary(preview.rows[0], await this.hasCurrentMonthImport(preview.rows[0].reporting_month));
    }
    async getRows(previewId, actorAccountId, filter, page, pageSize) {
        const summary = await this.getSummary(previewId, actorAccountId);
        if (!summary)
            return null;
        const validity = filter === 'all' ? null : filter === 'valid';
        const [rows, count] = await Promise.all([
            this.database.query(`SELECT row_number, row_data, issues
         FROM public.namelist_import_preview_rows
         WHERE preview_id = $1 AND ($2::boolean IS NULL OR is_valid = $2)
         ORDER BY row_number LIMIT $3 OFFSET $4`, [previewId, validity, pageSize, (page - 1) * pageSize]),
            this.database.query(`SELECT COUNT(*)::text AS count FROM public.namelist_import_preview_rows
         WHERE preview_id = $1 AND ($2::boolean IS NULL OR is_valid = $2)`, [previewId, validity]),
        ]);
        return {
            ...summary,
            rows: rows.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data, issues: row.issues })),
            page,
            pageSize,
            filteredRows: Number(count.rows[0]?.count ?? 0),
        };
    }
    async getAllRows(previewId, actorAccountId) {
        if (!(await this.getSummary(previewId, actorAccountId)))
            return null;
        const result = await this.database.query(`SELECT row_number, row_data, issues FROM public.namelist_import_preview_rows
       WHERE preview_id = $1 ORDER BY row_number`, [previewId]);
        return result.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data, issues: row.issues }));
    }
    async replaceRows(previewId, actorAccountId, rows) {
        const payload = rows.map((row) => ({ row_number: row.rowNumber, row_data: row.values, issues: row.issues, is_valid: row.issues.length === 0 }));
        const validRows = rows.filter((row) => row.issues.length === 0).length;
        await this.database.transaction(async (client) => {
            const preview = await client.query(`SELECT 1 FROM public.namelist_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP
         FOR UPDATE`, [previewId, actorAccountId]);
            if (!preview.rowCount)
                throw new Error('PREVIEW_NOT_FOUND');
            await client.query(`UPDATE public.namelist_import_preview_rows target
         SET row_data = source.row_data, issues = source.issues, is_valid = source.is_valid
         FROM JSONB_TO_RECORDSET($2::jsonb) AS source(row_number integer, row_data jsonb, issues jsonb, is_valid boolean)
         WHERE target.preview_id = $1 AND target.row_number = source.row_number`, [previewId, JSON.stringify(payload)]);
            await client.query(`UPDATE public.namelist_import_previews SET valid_rows = $2, invalid_rows = total_rows - $2
         WHERE preview_id = $1`, [previewId, validRows]);
        });
    }
    async cancel(previewId, actorAccountId) {
        const result = await this.database.query(`DELETE FROM public.namelist_import_previews WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'`, [previewId, actorAccountId]);
        return (result.rowCount ?? 0) > 0;
    }
    async commit(previewId, actorAccountId, confirmReplacement) {
        return this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('employee_namelist_import'))`);
            const preview = await client.query(`SELECT preview_id, file_name, reporting_month, total_rows, valid_rows, invalid_rows
         FROM public.namelist_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [previewId, actorAccountId]);
            const record = preview.rows[0];
            if (!record)
                throw new Error('PREVIEW_NOT_FOUND');
            if (record.invalid_rows > 0)
                throw new Error('INVALID_ROWS');
            if ((await this.hasCurrentMonthImport(record.reporting_month, client)) && !confirmReplacement)
                throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');
            const audit = await client.query(`INSERT INTO public.namelist_imports (reporting_month, imported_by, file_name, total_rows, status)
         VALUES ($1, $2, $3, $4, 'processing') RETURNING id::text`, [record.reporting_month, actorAccountId, record.file_name, record.total_rows]);
            await client.query('DELETE FROM public.employee_namelist');
            await client.query(`INSERT INTO public.employee_namelist (
           pers_no, personnel_number, employee_group, lp, esgrp, employee_subgroup,
           ps_group, organizational_unit, range, function, organisational_area_pa,
           gender_key, location, pa, personnel_area, psubarea, personnel_subarea,
           nt_id, global_id, cost_center, birth_date, joining_date, entry_for_retirement,
           designation_text, hrbp_global_id, hrbp2_global_id, official_email,
           technical_entry_date, direct_or_indirect
         ) SELECT
           (row_data->>'pers_no')::bigint, row_data->>'personnel_number', row_data->>'employee_group',
           row_data->>'lp', row_data->>'esgrp', row_data->>'employee_subgroup', row_data->>'ps_group',
           row_data->>'organizational_unit', row_data->>'range', NULLIF(row_data->>'function', ''),
           row_data->>'organisational_area_pa', row_data->>'gender_key', row_data->>'location', row_data->>'pa',
           row_data->>'personnel_area', row_data->>'psubarea', row_data->>'personnel_subarea', row_data->>'nt_id',
           (row_data->>'global_id')::bigint, row_data->>'cost_center', (row_data->>'birth_date')::date,
           (row_data->>'joining_date')::date, (row_data->>'entry_for_retirement')::date,
           row_data->>'designation_text', (row_data->>'hrbp_global_id')::bigint, row_data->>'hrbp2_global_id',
           row_data->>'official_email', (row_data->>'technical_entry_date')::date, row_data->>'direct_or_indirect'
         FROM public.namelist_import_preview_rows WHERE preview_id = $1 ORDER BY row_number`, [previewId]);
            await client.query(`UPDATE public.namelist_imports SET status = 'completed' WHERE id = $1`, [audit.rows[0].id]);
            await client.query(`UPDATE public.namelist_import_previews SET status = 'committed' WHERE preview_id = $1`, [previewId]);
            return record.total_rows;
        });
    }
    buildSummary(record, hasCurrentMonthImport) {
        return {
            id: record.preview_id,
            fileName: record.file_name,
            reportingMonth: mapMonth(record.reporting_month),
            totalRows: record.total_rows,
            validRows: record.valid_rows,
            invalidRows: record.invalid_rows,
            hasCurrentMonthImport,
        };
    }
    async hasCurrentMonthImport(reportingMonth, client = this.database) {
        const result = await client.query(`SELECT EXISTS (SELECT 1 FROM public.namelist_imports WHERE reporting_month = $1 AND status = 'completed') AS exists`, [reportingMonth]);
        return result.rows[0]?.exists ?? false;
    }
};
exports.NamelistImportRepository = NamelistImportRepository;
exports.NamelistImportRepository = NamelistImportRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], NamelistImportRepository);
//# sourceMappingURL=namelist-import.repository.js.map