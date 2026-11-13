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
exports.PsExitImportService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../../database/database.service");
const attrition_import_parser_1 = require("../attrition-import/attrition-import.parser");
const ps_exit_import_parser_1 = require("./ps-exit-import.parser");
let PsExitImportService = class PsExitImportService {
    database;
    constructor(database) {
        this.database = database;
    }
    uuid(id) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            throw new common_1.BadRequestException('Invalid preview ID.');
        }
    }
    async rangeMappings(client) {
        const result = await client.query('SELECT organizational_unit, range_value FROM public.org_unit_range_mappings');
        return new Map(result.rows.map((row) => [row.organizational_unit.trim().toLowerCase(), row.range_value.trim()]));
    }
    async previewLock(client, actor, id) {
        this.uuid(id);
        const result = await client.query(`SELECT file_name, file_hash FROM public.ps_exit_previews
       WHERE preview_id = $1 AND uploaded_by_account_id = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [id, actor]);
        if (!result.rows[0])
            throw new common_1.NotFoundException('Preview expired or was not found. Upload the workbook again.');
        return result.rows[0];
    }
    dateKey(value) {
        if (!(value instanceof Date))
            return String(value).slice(0, 7);
        return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}`;
    }
    async validatedRows(client, id) {
        const found = await client.query('SELECT row_number, row_data FROM public.ps_exit_preview_rows WHERE preview_id = $1 ORDER BY row_number', [id]);
        const rows = (0, ps_exit_import_parser_1.validatePsExitRows)(found.rows.map((row) => ({ rowNumber: row.row_number, values: (0, attrition_import_parser_1.cleanAttritionStoredValues)(row.row_data) })), await this.rangeMappings(client));
        const persNos = [...new Set(rows.filter((row) => row.values.pers_no).map((row) => row.values.pers_no))];
        if (!persNos.length)
            return rows;
        const existing = await client.query(`SELECT pers_no::text, event_month, source, transfer_type
       FROM public.employee_attrition_events
       WHERE deleted_at IS NULL AND pers_no = ANY($1::bigint[])`, [persNos]);
        const conflicts = new Set(existing.rows
            .filter((event) => !(event.source === 'ps_exit' || (event.source === 'rbin' && event.transfer_type === 'out_of_ps_within_rbin')))
            .map((event) => `${event.pers_no}:${this.dateKey(event.event_month)}`));
        for (const row of rows) {
            if (row.lwd && conflicts.has(`${row.values.pers_no}:${row.lwd.slice(0, 7)}`)) {
                row.issues.push({
                    column: 'pers_no', code: 'event_conflict', severity: 'error',
                    message: 'A reviewed, manual, or within-PS event already exists for this employee and LWD month.',
                });
            }
        }
        return rows;
    }
    async upload(actor, file) {
        if (!file)
            throw new common_1.BadRequestException('Choose a PS Exit XLSX workbook.');
        if (file.buffer.length > 50 * 1024 * 1024)
            throw new common_1.BadRequestException('File exceeds 50 MB.');
        const parsedRows = await (0, ps_exit_import_parser_1.parsePsExitFile)(file);
        const id = await this.database.transaction(async (client) => {
            await client.query('DELETE FROM public.ps_exit_previews WHERE expires_at <= CURRENT_TIMESTAMP');
            const rows = (0, ps_exit_import_parser_1.validatePsExitRows)(parsedRows, await this.rangeMappings(client));
            const preview = await client.query(`INSERT INTO public.ps_exit_previews (uploaded_by_account_id, file_name, file_hash)
         VALUES ($1, $2, $3) RETURNING preview_id`, [actor, file.originalname, (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex')]);
            await client.query(`INSERT INTO public.ps_exit_preview_rows (preview_id, row_number, row_data, issues)
         SELECT $1, item.row_number, item.row_data, item.issues
         FROM JSONB_TO_RECORDSET($2::jsonb) AS item(row_number integer, row_data jsonb, issues jsonb)`, [preview.rows[0].preview_id, JSON.stringify(rows.map((row) => ({ row_number: row.rowNumber, row_data: row.values, issues: row.issues })))]);
            return preview.rows[0].preview_id;
        });
        return this.preview(actor, id, 'all', '', '1');
    }
    async preview(actor, id, filterInput = 'all', periodInput = '', pageInput = '1') {
        if (!['all', 'warnings', 'errors'].includes(filterInput))
            throw new common_1.BadRequestException('Invalid preview filter.');
        if (periodInput && !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodInput))
            throw new common_1.BadRequestException('Invalid LWD period filter.');
        if (!/^[1-9]\d{0,4}$/.test(pageInput))
            throw new common_1.BadRequestException('Invalid preview page.');
        const filter = filterInput;
        return this.database.transaction(async (client) => {
            const preview = await this.previewLock(client, actor, id);
            const rows = await this.validatedRows(client, id);
            const periodRows = periodInput ? rows.filter((row) => row.lwd.startsWith(periodInput)) : rows;
            const warningRows = periodRows.filter((row) => row.issues.some((issue) => issue.severity === 'warning')).length;
            const errorRows = periodRows.filter((row) => row.issues.some((issue) => issue.severity === 'error')).length;
            const selected = filter === 'all' ? periodRows : periodRows.filter((row) => row.issues.some((issue) => issue.severity === filter.slice(0, -1)));
            const page = Math.min(Number(pageInput), Math.max(1, Math.ceil(selected.length / 25)));
            const validDates = rows.map((row) => row.lwd).filter(Boolean).sort();
            const periods = [...new Set(validDates.map((date) => date.slice(0, 7)))];
            return {
                id, fileName: preview.file_name, totalRows: periodRows.length, warningRows, errorRows,
                minimumLwd: validDates[0] ?? null, maximumLwd: validDates.at(-1) ?? null,
                retainedPeriod: validDates.at(-1)?.slice(0, 7) ?? null, periods, period: periodInput,
                filteredRows: selected.length, page, rows: selected.slice((page - 1) * 25, page * 25),
            };
        });
    }
    async editPreview(actor, id, rowInput, input) {
        if (!/^[1-9]\d{0,5}$/.test(rowInput))
            throw new common_1.BadRequestException('Invalid Excel row number.');
        const values = input === undefined ? undefined : (0, attrition_import_parser_1.cleanAttritionValues)(input);
        await this.database.transaction(async (client) => {
            await this.previewLock(client, actor, id);
            let result;
            if (values) {
                const previous = await client.query('SELECT row_data FROM public.ps_exit_preview_rows WHERE preview_id = $1 AND row_number = $2', [id, Number(rowInput)]);
                if (!previous.rows[0])
                    throw new common_1.NotFoundException('Preview row was not found.');
                const oldValues = (0, attrition_import_parser_1.cleanAttritionStoredValues)(previous.rows[0].row_data);
                const rangeSource = values.range === oldValues.range ? oldValues.range_source : values.range ? 'uploaded' : 'missing';
                const [validated] = (0, ps_exit_import_parser_1.validatePsExitRows)([{ rowNumber: Number(rowInput), values: { ...values, range_source: rangeSource } }], await this.rangeMappings(client));
                result = await client.query(`UPDATE public.ps_exit_preview_rows SET row_data = $3::jsonb, issues = $4::jsonb
           WHERE preview_id = $1 AND row_number = $2`, [id, Number(rowInput), JSON.stringify(validated.values), JSON.stringify(validated.issues)]);
            }
            else {
                const count = await client.query('SELECT COUNT(*)::text AS count FROM public.ps_exit_preview_rows WHERE preview_id = $1', [id]);
                if (Number(count.rows[0]?.count ?? 0) <= 1)
                    throw new common_1.ConflictException('The final preview row cannot be deleted.');
                result = await client.query('DELETE FROM public.ps_exit_preview_rows WHERE preview_id = $1 AND row_number = $2', [id, Number(rowInput)]);
            }
            if (!result.rowCount)
                throw new common_1.NotFoundException('Preview row was not found.');
        });
    }
    async cancel(actor, id) {
        await this.database.transaction(async (client) => {
            await this.previewLock(client, actor, id);
            await client.query('DELETE FROM public.ps_exit_previews WHERE preview_id = $1', [id]);
        });
    }
    async commit(actor, id, confirmed, periodInput) {
        if (confirmed !== true)
            throw new common_1.BadRequestException('Confirm the PS Exit import.');
        if (typeof periodInput !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodInput)) {
            throw new common_1.BadRequestException('Select one LWD month before saving.');
        }
        return this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('ps-exit-import'))`);
            const preview = await this.previewLock(client, actor, id);
            const rows = (await this.validatedRows(client, id)).filter((row) => row.lwd.startsWith(periodInput));
            if (!rows.length)
                throw new common_1.ConflictException('The preview does not contain any rows.');
            if (rows.some((row) => row.issues.some((issue) => issue.severity === 'error'))) {
                throw new common_1.ConflictException('Resolve every blocking error before import.');
            }
            const dates = rows.map((row) => row.lwd).sort();
            const maximumLwd = dates.at(-1);
            const retainedPeriod = periodInput;
            const imported = await client.query(`INSERT INTO public.ps_exit_imports
           (file_name, file_hash, row_count, minimum_lwd, maximum_lwd, retained_month, imported_by_account_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING import_id`, [preview.file_name, preview.file_hash, rows.length, dates[0], maximumLwd, `${retainedPeriod}-01`, actor]);
            const importId = imported.rows[0].import_id;
            const payload = rows.map((row) => ({
                row_number: row.rowNumber, ...row.values, initiated_date: row.initiatedDate || null,
                lwd: row.lwd, classification: row.classification,
            }));
            const eligible = await client.query(`WITH input AS (
           SELECT * FROM JSONB_TO_RECORDSET($1::jsonb) AS item(pers_no text, lwd date)
         )
         SELECT DISTINCT input.pers_no
         FROM input
         WHERE EXISTS (
           SELECT 1 FROM public.attrition_departure_candidates candidate
           WHERE candidate.pers_no = input.pers_no::bigint
             AND candidate.source = 'rbin' AND candidate.status = 'pending'
         ) OR EXISTS (
           SELECT 1 FROM public.employee_attrition_events event
           WHERE event.pers_no = input.pers_no::bigint
             AND event.event_month = DATE_TRUNC('month', input.lwd)::date
             AND event.source = 'ps_exit' AND event.deleted_at IS NULL
         )`, [JSON.stringify(payload)]);
            const eligiblePersNos = new Set(eligible.rows.map((row) => row.pers_no));
            const matchedPayload = payload.filter((row) => eligiblePersNos.has(row.pers_no));
            const unmatchedPayload = payload.filter((row) => !eligiblePersNos.has(row.pers_no));
            await client.query('DELETE FROM public.ps_exit_rows');
            await client.query(`INSERT INTO public.ps_exit_rows (
           import_id, source_row_number, pers_no, personnel_number, ps_group, gender_key,
           filter_value, reason_for_action, detailed_reason_approved, org_unit, range_value,
           initiated_date, lwd, e_separation_request_no, to_org_unit, classification
         )
         SELECT $1, item.row_number, item.pers_no::bigint, NULLIF(item.employee_name, ''),
           NULLIF(item.ps_group, ''), NULLIF(item.gender_key, ''), NULLIF(item.filter_value, ''),
           item.reason_for_action, NULLIF(item.detailed_reason_approved, ''), NULLIF(item.org_unit, ''),
           NULLIF(item.range, ''), item.initiated_date::date, item.lwd::date,
           NULLIF(item.e_separation_request_no, ''), NULLIF(item.to_org_unit, ''), item.classification
         FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
           row_number integer, pers_no text, employee_name text, ps_group text, gender_key text,
           filter_value text, reason_for_action text, detailed_reason_approved text, org_unit text,
           range text, initiated_date date, lwd date, e_separation_request_no text, to_org_unit text,
           classification text
         ) WHERE DATE_TRUNC('month', item.lwd) = $3::date`, [importId, JSON.stringify(payload), `${retainedPeriod}-01`]);
            const updated = await client.query(`WITH input AS (
           SELECT * FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             pers_no text, reason_for_action text, detailed_reason_approved text, org_unit text,
             range text, lwd date, to_org_unit text, classification text
           )
         )
         UPDATE public.employee_attrition_events event SET
           event_type = CASE WHEN input.classification = 'out_of_ps_transfer' THEN 'transfer' ELSE input.classification END,
           transfer_type = CASE WHEN input.classification = 'out_of_ps_transfer' THEN 'out_of_ps_out_of_rbin' ELSE NULL END,
           within_ps_type = NULL, counts_as_ps_attrition = TRUE, classification_status = 'confirmed',
           source = 'ps_exit', old_organisational_area_pa = 'PS', new_organisational_area_pa = NULL,
           old_organizational_unit = NULLIF(input.org_unit, ''),
           new_organizational_unit = CASE WHEN input.classification = 'out_of_ps_transfer' THEN NULLIF(input.to_org_unit, '') ELSE NULL END,
           old_range = NULLIF(input.range, ''), new_range = NULL,
           old_range_type = CASE WHEN NULLIF(BTRIM(input.range), '') IS NULL THEN NULL WHEN UPPER(BTRIM(input.range)) IN ('BIDP', 'NAP', 'JAP', 'GANP') THEN 'plant' ELSE 'corporate' END,
           new_range_type = NULL, ps_exit_import_id = $1, exit_lwd = input.lwd,
           exit_reason = input.reason_for_action, notes = NULLIF(input.detailed_reason_approved, ''),
           updated_by_account_id = $3, updated_at = CURRENT_TIMESTAMP
         FROM input
         WHERE event.deleted_at IS NULL AND event.pers_no = input.pers_no::bigint
           AND event.event_month = DATE_TRUNC('month', input.lwd)::date
           AND (event.source = 'ps_exit' OR (event.source = 'rbin' AND event.transfer_type = 'out_of_ps_within_rbin'))
         RETURNING event.event_id`, [importId, JSON.stringify(matchedPayload), actor]);
            const inserted = await client.query(`WITH input AS (
           SELECT * FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             pers_no text, reason_for_action text, detailed_reason_approved text, org_unit text,
             range text, lwd date, to_org_unit text, classification text
           )
         )
         INSERT INTO public.employee_attrition_events (
           pers_no, event_month, event_type, transfer_type, within_ps_type,
           counts_as_ps_attrition, classification_status, source,
           old_organisational_area_pa, old_organizational_unit, new_organizational_unit,
           old_range, old_range_type, ps_exit_import_id, exit_lwd, exit_reason, notes,
           created_by_account_id, updated_by_account_id
         )
         SELECT input.pers_no::bigint, DATE_TRUNC('month', input.lwd)::date,
           CASE WHEN input.classification = 'out_of_ps_transfer' THEN 'transfer' ELSE input.classification END,
           CASE WHEN input.classification = 'out_of_ps_transfer' THEN 'out_of_ps_out_of_rbin' ELSE NULL END,
           NULL, TRUE, 'confirmed', 'ps_exit', 'PS', NULLIF(input.org_unit, ''),
           CASE WHEN input.classification = 'out_of_ps_transfer' THEN NULLIF(input.to_org_unit, '') ELSE NULL END,
           NULLIF(input.range, ''),
           CASE WHEN NULLIF(BTRIM(input.range), '') IS NULL THEN NULL WHEN UPPER(BTRIM(input.range)) IN ('BIDP', 'NAP', 'JAP', 'GANP') THEN 'plant' ELSE 'corporate' END,
           $1, input.lwd, input.reason_for_action, NULLIF(input.detailed_reason_approved, ''), $3, $3
         FROM input
         WHERE NOT EXISTS (
           SELECT 1 FROM public.employee_attrition_events event
           WHERE event.pers_no = input.pers_no::bigint
             AND event.event_month = DATE_TRUNC('month', input.lwd)::date AND event.deleted_at IS NULL
         ) RETURNING event_id`, [importId, JSON.stringify(matchedPayload), actor]);
            const pending = await client.query(`WITH input AS (
           SELECT * FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             pers_no text, reason_for_action text, detailed_reason_approved text,
             org_unit text, range text, lwd date
           )
         )
         INSERT INTO public.attrition_departure_candidates (
           pers_no, detected_month, previous_organisational_area_pa,
           previous_organizational_unit, previous_range, previous_range_type,
           source, ps_exit_import_id, exit_lwd, exit_reason,
           resolution_note, created_by_account_id
         )
         SELECT input.pers_no::bigint, DATE_TRUNC('month', input.lwd)::date, 'PS',
           NULLIF(input.org_unit, ''), NULLIF(input.range, ''),
           CASE WHEN NULLIF(BTRIM(input.range), '') IS NULL THEN NULL
             WHEN UPPER(BTRIM(input.range)) IN ('BIDP', 'NAP', 'JAP', 'GANP') THEN 'plant'
             ELSE 'corporate' END,
           'ps_exit', $1, input.lwd, input.reason_for_action,
           NULLIF(input.detailed_reason_approved, ''), $3
         FROM input
         ON CONFLICT (pers_no, detected_month) DO NOTHING
         RETURNING candidate_id`, [importId, JSON.stringify(unmatchedPayload), actor]);
            const matched = await client.query(`WITH matches AS (
           SELECT candidate.candidate_id, event.event_id
           FROM public.employee_attrition_events event
           JOIN LATERAL (
             SELECT pending.candidate_id
             FROM public.attrition_departure_candidates pending
             WHERE pending.pers_no = event.pers_no
               AND pending.source = 'rbin' AND pending.status = 'pending'
             ORDER BY pending.detected_month DESC, pending.created_at DESC
             LIMIT 1
           ) candidate ON TRUE
           WHERE event.source = 'ps_exit' AND event.ps_exit_import_id = $1
             AND event.deleted_at IS NULL
         )
         UPDATE public.attrition_departure_candidates candidate SET
           status = 'matched', linked_event_id = matches.event_id,
           resolution_note = 'Matched automatically from PS Exit data.',
           resolved_by_account_id = $2, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         FROM matches WHERE candidate.candidate_id = matches.candidate_id
         RETURNING candidate.candidate_id`, [importId, actor]);
            await client.query('DELETE FROM public.ps_exit_previews WHERE preview_id = $1', [id]);
            return {
                importedRows: rows.length, retainedRows: rows.length,
                retainedPeriod, insertedEvents: inserted.rowCount ?? inserted.rows.length,
                updatedEvents: updated.rowCount ?? updated.rows.length, matchedCandidates: matched.rowCount ?? matched.rows.length,
                pendingPsExit: pending.rowCount ?? pending.rows.length,
            };
        });
    }
};
exports.PsExitImportService = PsExitImportService;
exports.PsExitImportService = PsExitImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], PsExitImportService);
//# sourceMappingURL=ps-exit-import.service.js.map