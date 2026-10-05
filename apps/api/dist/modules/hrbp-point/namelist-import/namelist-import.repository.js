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
    async createPreview(actorAccountId, file, rows, reportingMonth) {
        return this.createPreviewForMonth(actorAccountId, file, rows, reportingMonth, 'live');
    }
    async createHistoricalPreview(actorAccountId, file, rows, reportingMonth) {
        return this.createPreviewForMonth(actorAccountId, file, rows, reportingMonth, 'historical');
    }
    async createPreviewForMonth(actorAccountId, file, rows, reportingMonth, importMode) {
        return this.database.transaction(async (client) => {
            await client.query(`DELETE FROM public.namelist_import_previews WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP`);
            const validRows = rows.filter((row) => row.issues.length === 0).length;
            const preview = await client.query(`INSERT INTO public.namelist_import_previews (
           uploaded_by, reporting_month, import_mode, file_name, file_hash,
           total_rows, valid_rows, invalid_rows
         ) VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)
         RETURNING preview_id`, [actorAccountId, reportingMonth, importMode, file.originalname, (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex'), rows.length, validRows, rows.length - validRows]);
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
        const preview = await this.database.query(`SELECT preview_id, file_name, reporting_month, import_mode, total_rows, valid_rows, invalid_rows
       FROM public.namelist_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP`, [previewId, actorAccountId]);
        if (!preview.rows[0])
            return null;
        const record = preview.rows[0];
        const hasExistingMonthImport = record.import_mode === 'historical'
            ? await this.hasHistoricalMonthImport(record.reporting_month)
            : await this.hasCurrentMonthImport(record.reporting_month);
        return this.buildSummary(record, hasExistingMonthImport);
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
            const preview = await client.query(`SELECT preview_id, file_name, reporting_month, import_mode, total_rows, valid_rows, invalid_rows
         FROM public.namelist_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [previewId, actorAccountId]);
            const record = preview.rows[0];
            if (!record)
                throw new Error('PREVIEW_NOT_FOUND');
            if (record.import_mode !== 'live')
                throw new Error('PREVIEW_MODE_MISMATCH');
            if (record.invalid_rows > 0)
                throw new Error('INVALID_ROWS');
            if ((await this.hasCurrentMonthImport(record.reporting_month, client)) && !confirmReplacement)
                throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');
            const currentLiveImport = await this.getCurrentLiveImport(client);
            if (currentLiveImport && mapMonth(record.reporting_month) < mapMonth(currentLiveImport.reporting_month)) {
                throw new Error('LIVE_MONTH_OUT_OF_SEQUENCE');
            }
            if (currentLiveImport && mapMonth(record.reporting_month) > mapMonth(currentLiveImport.reporting_month)) {
                await this.copyLiveToMonthly(currentLiveImport, client);
            }
            const audit = await client.query(`INSERT INTO public.namelist_imports (
           reporting_month, reporting_month_confirmed, import_mode,
           imported_by, file_name, total_rows, status
         ) VALUES ($1, TRUE, 'live', $2, $3, $4, 'processing') RETURNING id::text`, [record.reporting_month, actorAccountId, record.file_name, record.total_rows]);
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
            await this.enforceDetailedRetention(actorAccountId, client);
            return record.total_rows;
        });
    }
    async commitHistorical(previewId, actorAccountId, confirmReplacement) {
        return this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('employee_namelist_import'))`);
            const preview = await client.query(`SELECT preview_id, file_name, reporting_month, import_mode, total_rows, valid_rows, invalid_rows
         FROM public.namelist_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [previewId, actorAccountId]);
            const record = preview.rows[0];
            if (!record)
                throw new Error('PREVIEW_NOT_FOUND');
            if (record.import_mode !== 'historical')
                throw new Error('PREVIEW_MODE_MISMATCH');
            if (record.invalid_rows > 0)
                throw new Error('INVALID_ROWS');
            const currentLiveImport = await this.getCurrentLiveImport(client);
            if (currentLiveImport && mapMonth(record.reporting_month) >= mapMonth(currentLiveImport.reporting_month)) {
                throw new Error('HISTORICAL_MONTH_NOT_BEFORE_LIVE');
            }
            if ((await this.hasHistoricalMonthImport(record.reporting_month, client)) && !confirmReplacement) {
                throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');
            }
            const audit = await client.query(`INSERT INTO public.namelist_imports (
           reporting_month, reporting_month_confirmed, import_mode,
           imported_by, file_name, total_rows, status
         ) VALUES ($1, TRUE, 'historical', $2, $3, $4, 'processing') RETURNING id::text`, [record.reporting_month, actorAccountId, record.file_name, record.total_rows]);
            await client.query(`DELETE FROM public.employee_namelist_monthly WHERE reporting_month = $1`, [record.reporting_month]);
            await client.query(`INSERT INTO public.employee_namelist_monthly (
           reporting_month, source_import_id, pers_no, personnel_number, employee_group,
           lp, esgrp, employee_subgroup, ps_group, organizational_unit, range, function,
           organisational_area_pa, gender_key, location, pa, personnel_area, psubarea,
           personnel_subarea, nt_id, global_id, cost_center, birth_date, joining_date,
           entry_for_retirement, designation_text, hrbp_global_id, hrbp2_global_id,
           official_email, technical_entry_date, direct_or_indirect
         ) SELECT
           $2::date, $3::bigint, (row_data->>'pers_no')::bigint,
           row_data->>'personnel_number', row_data->>'employee_group', row_data->>'lp',
           row_data->>'esgrp', row_data->>'employee_subgroup', row_data->>'ps_group',
           row_data->>'organizational_unit', row_data->>'range', NULLIF(row_data->>'function', ''),
           row_data->>'organisational_area_pa', row_data->>'gender_key', row_data->>'location',
           row_data->>'pa', row_data->>'personnel_area', row_data->>'psubarea',
           row_data->>'personnel_subarea', row_data->>'nt_id', (row_data->>'global_id')::bigint,
           row_data->>'cost_center', (row_data->>'birth_date')::date,
           (row_data->>'joining_date')::date, (row_data->>'entry_for_retirement')::date,
           row_data->>'designation_text', (row_data->>'hrbp_global_id')::bigint,
           row_data->>'hrbp2_global_id', row_data->>'official_email',
           (row_data->>'technical_entry_date')::date, row_data->>'direct_or_indirect'
         FROM public.namelist_import_preview_rows
         WHERE preview_id = $1 ORDER BY row_number`, [previewId, record.reporting_month, audit.rows[0].id]);
            await client.query(`UPDATE public.namelist_imports SET status = 'completed' WHERE id = $1`, [audit.rows[0].id]);
            await client.query(`UPDATE public.namelist_import_previews SET status = 'committed' WHERE preview_id = $1`, [previewId]);
            await this.enforceDetailedRetention(actorAccountId, client);
            return record.total_rows;
        });
    }
    async getCurrentLiveImport(client) {
        const result = await client.query(`SELECT id::text, reporting_month
       FROM public.namelist_imports
       WHERE reporting_month_confirmed
         AND import_mode = 'live' AND status = 'completed'
       ORDER BY reporting_month DESC, imported_at DESC, id DESC
       LIMIT 1`);
        return result.rows[0] ?? null;
    }
    async copyLiveToMonthly(currentLiveImport, client) {
        await client.query(`DELETE FROM public.employee_namelist_monthly WHERE reporting_month = $1`, [currentLiveImport.reporting_month]);
        await client.query(`INSERT INTO public.employee_namelist_monthly (
         reporting_month, source_import_id, pers_no, personnel_number, employee_group,
         lp, esgrp, employee_subgroup, ps_group, organizational_unit, range, function,
         organisational_area_pa, gender_key, location, pa, personnel_area, psubarea,
         personnel_subarea, nt_id, global_id, cost_center, birth_date, joining_date,
         entry_for_retirement, designation_text, hrbp_global_id, hrbp2_global_id,
         official_email, technical_entry_date, direct_or_indirect
       ) SELECT
         $1::date, $2::bigint, pers_no, personnel_number, employee_group,
         lp, esgrp, employee_subgroup, ps_group, organizational_unit, range, function,
         organisational_area_pa, gender_key, location, pa, personnel_area, psubarea,
         personnel_subarea, nt_id, global_id, cost_center, birth_date, joining_date,
         entry_for_retirement, designation_text, hrbp_global_id, hrbp2_global_id,
         official_email, technical_entry_date, direct_or_indirect
       FROM public.employee_namelist`, [currentLiveImport.reporting_month, currentLiveImport.id]);
    }
    async enforceDetailedRetention(actorAccountId, client) {
        const expired = await client.query(`WITH current_live AS (
         SELECT reporting_month
         FROM public.namelist_imports
         WHERE reporting_month_confirmed
           AND import_mode = 'live' AND status = 'completed'
         ORDER BY reporting_month DESC, imported_at DESC, id DESC
         LIMIT 1
       ), available_months AS (
         SELECT reporting_month FROM current_live
         UNION
         SELECT DISTINCT reporting_month FROM public.employee_namelist_monthly
       )
       SELECT reporting_month
       FROM available_months
       ORDER BY reporting_month DESC
       OFFSET 3`);
        for (const row of expired.rows) {
            await this.archiveOverviewMonth(row.reporting_month, actorAccountId, client);
            await client.query(`DELETE FROM public.employee_namelist_monthly WHERE reporting_month = $1`, [row.reporting_month]);
        }
    }
    async archiveOverviewMonth(reportingMonth, actorAccountId, client) {
        const sourceImport = await client.query(`SELECT MAX(source_import_id)::text AS source_import_id
       FROM public.employee_namelist_monthly
       WHERE reporting_month = $1`, [reportingMonth]);
        const snapshot = await client.query(`WITH next_version AS (
         SELECT COALESCE(MAX(version), 0) + 1 AS version
         FROM public.dashboard_json_snapshots
         WHERE dashboard_key = 'overview' AND reporting_month = $1
       ), payload AS (
         SELECT JSONB_BUILD_OBJECT(
           'kpis', public.get_workforce_kpis(
             ($1::date + INTERVAL '1 month - 1 day')::date,
             NULL, NULL, NULL, NULL, NULL, NULL, $2::uuid, $1::date
           ),
           'charts', public.get_workforce_charts(
             ($1::date + INTERVAL '1 month - 1 day')::date,
             NULL, NULL, NULL, NULL, NULL, NULL, $2::uuid, $1::date
           ),
           'reportingMonth', TO_CHAR($1::date, 'YYYY-MM'),
           'filterOptions', JSONB_BUILD_OBJECT(
             'functionName', '[]'::jsonb,
             'orgUnit', '[]'::jsonb,
             'range', '[]'::jsonb,
             'location', '[]'::jsonb,
             'gender', '[]'::jsonb,
             'directOrIndirect', '[]'::jsonb
           )
         ) AS value
       ), deactivate AS (
         UPDATE public.dashboard_json_snapshots
         SET is_active = FALSE
         WHERE dashboard_key = 'overview' AND reporting_month = $1 AND is_active
       )
       INSERT INTO public.dashboard_json_snapshots (
         dashboard_key, reporting_month, version, payload, checksum,
         source_import_id, created_by, is_active
       )
       SELECT 'overview', $1::date, next_version.version, payload.value,
              MD5(payload.value::text), $3::bigint, $2::uuid, TRUE
       FROM next_version CROSS JOIN payload
       RETURNING id::text, checksum`, [reportingMonth, actorAccountId, sourceImport.rows[0]?.source_import_id ?? null]);
        const stored = snapshot.rows[0];
        if (!stored)
            throw new Error('SNAPSHOT_VERIFICATION_FAILED');
        const verification = await client.query(`SELECT checksum = MD5(payload::text) AS verified
       FROM public.dashboard_json_snapshots WHERE id = $1::bigint`, [stored.id]);
        if (!verification.rows[0]?.verified)
            throw new Error('SNAPSHOT_VERIFICATION_FAILED');
    }
    buildSummary(record, hasExistingMonthImport) {
        return {
            id: record.preview_id,
            fileName: record.file_name,
            reportingMonth: mapMonth(record.reporting_month),
            importMode: record.import_mode,
            totalRows: record.total_rows,
            validRows: record.valid_rows,
            invalidRows: record.invalid_rows,
            hasExistingMonthImport,
        };
    }
    async hasCurrentMonthImport(reportingMonth, client = this.database) {
        const result = await client.query(`SELECT EXISTS (
         SELECT 1 FROM public.namelist_imports
         WHERE reporting_month = $1 AND reporting_month_confirmed
           AND import_mode = 'live' AND status = 'completed'
       ) AS exists`, [reportingMonth]);
        return result.rows[0]?.exists ?? false;
    }
    async hasHistoricalMonthImport(reportingMonth, client = this.database) {
        const result = await client.query(`SELECT EXISTS (
         SELECT 1 FROM public.namelist_imports
         WHERE reporting_month = $1 AND reporting_month_confirmed
           AND import_mode = 'historical' AND status = 'completed'
       ) AS exists`, [reportingMonth]);
        return result.rows[0]?.exists ?? false;
    }
};
exports.NamelistImportRepository = NamelistImportRepository;
exports.NamelistImportRepository = NamelistImportRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], NamelistImportRepository);
//# sourceMappingURL=namelist-import.repository.js.map