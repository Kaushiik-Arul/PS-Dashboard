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
exports.NominationStatusService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../../database/database.service");
const nomination_status_parser_1 = require("./nomination-status.parser");
const nomination_status_types_1 = require("./nomination-status.types");
let NominationStatusService = class NominationStatusService {
    database;
    constructor(database) {
        this.database = database;
    }
    uuid(id) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
            throw new common_1.BadRequestException('Invalid preview ID.');
    }
    async lockState(client) {
        const result = await client.query('SELECT revision::TEXT FROM public.nomination_status_state WHERE singleton = TRUE FOR UPDATE');
        return result.rows[0].revision;
    }
    async upload(actor, file) {
        if (!file)
            throw new common_1.BadRequestException('Choose a CSV or XLSX file.');
        if (file.buffer.length > 50 * 1024 * 1024)
            throw new common_1.BadRequestException('File exceeds 50 MB.');
        const rows = await (0, nomination_status_parser_1.parseNominationStatusFile)(file);
        return this.database.transaction(async (client) => {
            const revision = await this.lockState(client);
            const result = await client.query(`INSERT INTO public.nomination_status_previews
          (base_revision, uploaded_by, file_name, file_hash)
        VALUES ($1, $2, $3, $4) RETURNING id`, [
                revision,
                actor,
                file.originalname,
                (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex'),
            ]);
            const id = result.rows[0].id;
            await client.query(`INSERT INTO public.nomination_status_preview_rows
          (preview_id, row_number, row_data)
        SELECT $1, row."rowNumber", row.values
        FROM JSONB_TO_RECORDSET($2::JSONB)
          AS row("rowNumber" INTEGER, values JSONB)`, [id, JSON.stringify(rows)]);
            return { id };
        });
    }
    async previewLock(client, actor, id) {
        this.uuid(id);
        const result = await client.query(`SELECT id, file_name, file_hash, base_revision::TEXT
      FROM public.nomination_status_previews
      WHERE id = $1 AND uploaded_by = $2 AND status = 'ready'
        AND expires_at > CURRENT_TIMESTAMP
      FOR UPDATE`, [id, actor]);
        if (!result.rows.length)
            throw new common_1.NotFoundException('Preview expired or was not found. Upload the file again.');
        return result.rows[0];
    }
    async validatedRows(client, id) {
        const found = await client.query(`SELECT row_number, row_data
      FROM public.nomination_status_preview_rows
      WHERE preview_id = $1 ORDER BY row_number`, [id]);
        return found.rows.map((row) => ({
            rowNumber: row.row_number,
            values: row.row_data,
            issues: (0, nomination_status_parser_1.validateNominationStatusRow)(row.row_data),
        }));
    }
    async preview(actor, id, filter = 'all', pageInput = '1') {
        if (!['all', 'valid', 'invalid'].includes(filter))
            throw new common_1.BadRequestException('Invalid filter.');
        if (!/^[1-9]\d{0,4}$/.test(pageInput))
            throw new common_1.BadRequestException('Invalid page.');
        return this.database.transaction(async (client) => {
            const preview = await this.previewLock(client, actor, id);
            const rows = await this.validatedRows(client, id);
            const invalidRows = rows.filter((row) => (0, nomination_status_types_1.hasNominationStatusErrors)(row.issues)).length;
            const selected = rows.filter((row) => filter === 'all' ||
                (filter === 'invalid'
                    ? (0, nomination_status_types_1.hasNominationStatusErrors)(row.issues)
                    : !(0, nomination_status_types_1.hasNominationStatusErrors)(row.issues)));
            const page = Math.min(+pageInput, Math.max(1, Math.ceil(selected.length / 25)));
            const existing = await client.query('SELECT COUNT(*)::TEXT AS count FROM public.nomination_status_rows');
            return {
                id,
                fileName: preview.file_name,
                totalRows: rows.length,
                validRows: rows.length - invalidRows,
                invalidRows,
                existingRows: +existing.rows[0].count,
                filteredRows: selected.length,
                page,
                rows: selected.slice((page - 1) * 25, page * 25),
            };
        });
    }
    async editPreview(actor, id, rowInput, input) {
        if (!/^[1-9]\d{0,5}$/.test(rowInput))
            throw new common_1.BadRequestException('Invalid file row number.');
        const values = input === undefined ? undefined : (0, nomination_status_parser_1.cleanNominationStatusValues)(input);
        await this.database.transaction(async (client) => {
            await this.previewLock(client, actor, id);
            if (!values) {
                const count = await client.query(`SELECT COUNT(*)::TEXT AS count
          FROM public.nomination_status_preview_rows WHERE preview_id = $1`, [id]);
                if (+count.rows[0].count <= 1)
                    throw new common_1.ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
            }
            const result = values
                ? await client.query(`UPDATE public.nomination_status_preview_rows
            SET row_data = $3::JSONB
            WHERE preview_id = $1 AND row_number = $2`, [id, +rowInput, JSON.stringify(values)])
                : await client.query(`DELETE FROM public.nomination_status_preview_rows
            WHERE preview_id = $1 AND row_number = $2`, [id, +rowInput]);
            if (!result.rowCount)
                throw new common_1.NotFoundException('Preview row was not found.');
        });
    }
    async cancel(actor, id) {
        await this.database.transaction(async (client) => {
            await this.previewLock(client, actor, id);
            await client.query('DELETE FROM public.nomination_status_previews WHERE id = $1', [id]);
        });
    }
    async commit(actor, id, confirmed) {
        if (confirmed !== true)
            throw new common_1.BadRequestException('Confirm replacement of every current nomination status row.');
        return this.database.transaction(async (client) => {
            const revision = await this.lockState(client);
            const preview = await this.previewLock(client, actor, id);
            if (preview.base_revision !== revision)
                throw new common_1.ConflictException('Nomination status data changed after preview. Upload the file again.');
            const rows = await this.validatedRows(client, id);
            if (!rows.length ||
                rows.some((row) => (0, nomination_status_types_1.hasNominationStatusErrors)(row.issues)))
                throw new common_1.ConflictException('Correct the invalid rows before replacing nomination status data.');
            const existing = await client.query('SELECT COUNT(*)::TEXT AS count FROM public.nomination_status_rows');
            const replacedRows = +existing.rows[0].count;
            const imported = await client.query(`INSERT INTO public.nomination_status_imports
          (file_name, file_hash, row_count, replaced_rows, imported_by)
        VALUES ($1, $2, $3, $4, $5) RETURNING id`, [
                preview.file_name,
                preview.file_hash,
                rows.length,
                replacedRows,
                actor,
            ]);
            await client.query('DELETE FROM public.nomination_status_rows');
            await client.query(`INSERT INTO public.nomination_status_rows
          (${nomination_status_types_1.nominationStatusColumns.join(', ')}, import_id, updated_by)
        SELECT value.year::INTEGER, value.corp_plant, value.range,
          value.department, value.employee_no::BIGINT, value.employee_name,
          value.talent_pool, value.result, value.admission, $2, $3
        FROM JSONB_TO_RECORDSET($1::JSONB) AS value(
          ${nomination_status_types_1.nominationStatusColumns.map((column) => `${column} TEXT`).join(', ')}
        )`, [
                JSON.stringify(rows.map((row) => row.values)),
                imported.rows[0].id,
                actor,
            ]);
            await client.query(`UPDATE public.nomination_status_state
        SET revision = revision + 1 WHERE singleton = TRUE`);
            await client.query(`UPDATE public.nomination_status_previews
        SET status = 'committed' WHERE id = $1`, [id]);
            return { importedRows: rows.length, replacedRows };
        });
    }
};
exports.NominationStatusService = NominationStatusService;
exports.NominationStatusService = NominationStatusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], NominationStatusService);
//# sourceMappingURL=nomination-status.service.js.map