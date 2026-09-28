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
exports.PoolRegisterService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../../database/database.service");
const pool_register_parser_1 = require("./pool-register.parser");
const pool_register_types_1 = require("./pool-register.types");
let PoolRegisterService = class PoolRegisterService {
    database;
    constructor(database) {
        this.database = database;
    }
    kind(value) {
        if (value !== 'development' && value !== 'talent')
            throw new common_1.BadRequestException('Unknown pool register.');
        return value;
    }
    uuid(id) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
            throw new common_1.BadRequestException('Invalid record ID.');
    }
    async employees(client, numbers) {
        const valid = numbers.filter((value) => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n);
        const result = await client.query(`SELECT pers_no::TEXT, COALESCE(personnel_number, '') AS employee_name,
      COALESCE(ps_group, '') AS ps_group, COALESCE(organizational_unit, '') AS department,
      COALESCE(range, '') AS range, COALESCE(gender_key, '') AS gender
      FROM public.employee_namelist WHERE pers_no = ANY($1::BIGINT[])`, [[...new Set(valid)]]);
        return new Map(result.rows.map((row) => [row.pers_no, row]));
    }
    async lookup(persNo) {
        if (!/^[1-9]\d{0,18}$/.test(persNo) ||
            BigInt(persNo) > 9223372036854775807n)
            throw new common_1.BadRequestException('Enter a valid personnel number.');
        return this.database.transaction(async (client) => ({
            employee: (await this.employees(client, [persNo])).get(persNo) ?? null,
        }));
    }
    async list(kind, actor) {
        const result = await this.database.query(`SELECT s.id, s.pers_no::TEXT, s.employee_name, s.ps_group,
      s.department, s.department_feb, s.range, s.pool, s.gender, TO_CHAR(s.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(s.end_date, 'YYYY-MM-DD') AS end_date, s.active_passive
      FROM public.pool_register_rows s LEFT JOIN public.employee_namelist e ON e.pers_no = s.pers_no
      WHERE s.kind = $1 AND EXISTS (SELECT 1 FROM public.master_access access WHERE access.account_id = $2::UUID
        AND (access.role IN ('hrbp', 'admin')
          OR (access.role = 'range_head' AND BTRIM(e.range) = BTRIM(access.assigned_range))
          OR (access.role IN ('department_head', 'sub_department_head') AND BTRIM(e.range) = BTRIM(access.assigned_range)
            AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit))))
      ORDER BY s.employee_name, s.pers_no`, [kind, actor]);
        return result.rows;
    }
    async lockState(client, kind) {
        const result = await client.query('SELECT revision::TEXT FROM public.pool_register_state WHERE kind = $1 FOR UPDATE', [kind]);
        return result.rows[0].revision;
    }
    async bump(client, kind) {
        await client.query('UPDATE public.pool_register_state SET revision = revision + 1 WHERE kind = $1', [kind]);
    }
    async save(kind, actor, input, id) {
        if (id)
            this.uuid(id);
        const values = (0, pool_register_parser_1.cleanValues)(input, kind);
        return this.database.transaction(async (client) => {
            await this.lockState(client, kind);
            const [row] = (0, pool_register_parser_1.validatePoolRows)([{ rowNumber: 2, values, issues: [] }], kind, await this.employees(client, [values.pers_no]));
            if ((0, pool_register_types_1.hasErrors)(row.issues))
                throw new common_1.BadRequestException({
                    message: 'Correct the highlighted values.',
                    issues: row.issues,
                });
            const duplicate = await client.query('SELECT 1 FROM public.pool_register_rows WHERE kind = $1 AND pers_no = $2::BIGINT AND ($3::UUID IS NULL OR id <> $3::UUID)', [kind, values.pers_no, id ?? null]);
            if (duplicate.rowCount)
                throw new common_1.ConflictException({
                    message: 'This personnel number already exists in this register.',
                    issues: [
                        {
                            column: 'pers_no',
                            message: 'Duplicate personnel number in this register.',
                            severity: 'error',
                        },
                    ],
                });
            const parameters = pool_register_types_1.poolColumns.map((key) => values[key]);
            let saved;
            if (id) {
                const result = await client.query(`UPDATE public.pool_register_rows SET ${pool_register_types_1.poolColumns.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_by = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13 AND kind = $14 RETURNING id`, [...parameters, actor, id, kind]);
                if (!result.rows.length)
                    throw new common_1.NotFoundException('Register row was not found.');
                saved = result.rows[0].id;
            }
            else {
                const result = await client.query(`INSERT INTO public.pool_register_rows (${pool_register_types_1.poolColumns.join(', ')}, updated_by, kind) VALUES (${pool_register_types_1.poolColumns.map((_, i) => `$${i + 1}`).join(', ')}, $12, $13) RETURNING id`, [...parameters, actor, kind]);
                saved = result.rows[0].id;
            }
            await this.bump(client, kind);
            return { id: saved, issues: row.issues };
        });
    }
    async remove(kind, id) {
        this.uuid(id);
        await this.database.transaction(async (client) => {
            await this.lockState(client, kind);
            const result = await client.query('DELETE FROM public.pool_register_rows WHERE id = $1 AND kind = $2', [id, kind]);
            if (!result.rowCount)
                throw new common_1.NotFoundException('Register row was not found.');
            await this.bump(client, kind);
        });
    }
    async upload(kind, actor, file) {
        if (!file)
            throw new common_1.BadRequestException('Choose a pool XLSX workbook.');
        if (file.buffer.length > 50 * 1024 * 1024)
            throw new common_1.BadRequestException('File exceeds 50 MB.');
        const rows = await (0, pool_register_parser_1.parsePoolFile)(file, kind);
        return this.database.transaction(async (client) => {
            const revision = await this.lockState(client, kind);
            const result = await client.query(`INSERT INTO public.pool_register_previews (kind, base_revision, uploaded_by, file_name, file_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [
                kind,
                revision,
                actor,
                file.originalname,
                (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex'),
            ]);
            const id = result.rows[0].id;
            await client.query(`INSERT INTO public.pool_register_preview_rows (preview_id, row_number, row_data)
        SELECT $1, r."rowNumber", r.values FROM JSONB_TO_RECORDSET($2::JSONB) AS r("rowNumber" INTEGER, values JSONB)`, [id, JSON.stringify(rows)]);
            return { id };
        });
    }
    async previewLock(client, kind, actor, id) {
        this.uuid(id);
        const result = await client.query(`SELECT id, file_name, file_hash, base_revision::TEXT FROM public.pool_register_previews
      WHERE id = $1 AND kind = $2 AND uploaded_by = $3 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [id, kind, actor]);
        if (!result.rows.length)
            throw new common_1.NotFoundException('Preview expired or was not found. Upload the workbook again.');
        return result.rows[0];
    }
    async validatedRows(client, kind, id) {
        const found = await client.query('SELECT row_number, row_data FROM public.pool_register_preview_rows WHERE preview_id = $1 ORDER BY row_number', [id]);
        const rows = found.rows.map((row) => ({
            rowNumber: row.row_number,
            values: row.row_data,
            issues: [],
        }));
        return (0, pool_register_parser_1.validatePoolRows)(rows, kind, await this.employees(client, rows.map((row) => row.values.pers_no)));
    }
    async preview(kind, actor, id, filter = 'all', pageInput = '1') {
        if (!['all', 'valid', 'warning', 'invalid'].includes(filter))
            throw new common_1.BadRequestException('Invalid filter.');
        if (!/^[1-9]\d{0,4}$/.test(pageInput))
            throw new common_1.BadRequestException('Invalid page.');
        return this.database.transaction(async (client) => {
            const preview = await this.previewLock(client, kind, actor, id);
            const rows = await this.validatedRows(client, kind, id);
            const invalid = rows.filter((row) => (0, pool_register_types_1.hasErrors)(row.issues)).length;
            const warnings = rows.filter((row) => !(0, pool_register_types_1.hasErrors)(row.issues) && row.issues.length > 0).length;
            const selected = rows.filter((row) => filter === 'all' ||
                (filter === 'invalid'
                    ? (0, pool_register_types_1.hasErrors)(row.issues)
                    : filter === 'warning'
                        ? !(0, pool_register_types_1.hasErrors)(row.issues) && row.issues.length > 0
                        : !row.issues.length));
            const page = Math.min(+pageInput, Math.max(1, Math.ceil(selected.length / 25)));
            const existing = await client.query('SELECT COUNT(*)::TEXT AS count FROM public.pool_register_rows WHERE kind = $1', [kind]);
            return {
                id,
                fileName: preview.file_name,
                totalRows: rows.length,
                validRows: rows.length - invalid - warnings,
                warningRows: warnings,
                invalidRows: invalid,
                existingRows: +existing.rows[0].count,
                filteredRows: selected.length,
                page,
                rows: selected.slice((page - 1) * 25, page * 25),
            };
        });
    }
    async editPreview(kind, actor, id, rowInput, input) {
        if (!/^[1-9]\d{0,5}$/.test(rowInput))
            throw new common_1.BadRequestException('Invalid Excel row number.');
        const values = input === undefined ? undefined : (0, pool_register_parser_1.cleanValues)(input, kind);
        await this.database.transaction(async (client) => {
            await this.previewLock(client, kind, actor, id);
            if (!values) {
                const count = await client.query('SELECT COUNT(*)::TEXT AS count FROM public.pool_register_preview_rows WHERE preview_id = $1', [id]);
                if (+count.rows[0].count <= 1)
                    throw new common_1.ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
            }
            const result = values
                ? await client.query('UPDATE public.pool_register_preview_rows SET row_data = $3::JSONB WHERE preview_id = $1 AND row_number = $2', [id, +rowInput, JSON.stringify(values)])
                : await client.query('DELETE FROM public.pool_register_preview_rows WHERE preview_id = $1 AND row_number = $2', [id, +rowInput]);
            if (!result.rowCount)
                throw new common_1.NotFoundException('Preview row was not found.');
        });
    }
    async cancel(kind, actor, id) {
        await this.database.transaction(async (client) => {
            await this.previewLock(client, kind, actor, id);
            await client.query('DELETE FROM public.pool_register_previews WHERE id = $1', [id]);
        });
    }
    async commit(kind, actor, id, confirmed) {
        if (confirmed !== true)
            throw new common_1.BadRequestException('Confirm replacement of every current row in this register.');
        return this.database.transaction(async (client) => {
            const revision = await this.lockState(client, kind);
            const preview = await this.previewLock(client, kind, actor, id);
            if (preview.base_revision !== revision)
                throw new common_1.ConflictException('This register changed after preview. Upload the workbook again before replacing it.');
            const rows = await this.validatedRows(client, kind, id);
            if (!rows.length || rows.some((row) => (0, pool_register_types_1.hasErrors)(row.issues)))
                throw new common_1.ConflictException('Correct the invalid rows before replacing this register.');
            const existing = await client.query('SELECT COUNT(*)::TEXT AS count FROM public.pool_register_rows WHERE kind = $1', [kind]);
            const replacedRows = +existing.rows[0].count;
            const imported = await client.query(`INSERT INTO public.pool_register_imports (kind,file_name,file_hash,row_count,replaced_rows,imported_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [
                kind,
                preview.file_name,
                preview.file_hash,
                rows.length,
                replacedRows,
                actor,
            ]);
            await client.query('DELETE FROM public.pool_register_rows WHERE kind = $1', [kind]);
            await client.query(`INSERT INTO public.pool_register_rows (${pool_register_types_1.poolColumns.join(', ')}, kind, updated_by, import_id)
        SELECT v.pers_no::BIGINT, v.employee_name, v.ps_group, v.department, v.department_feb, v.range, v.pool, v.gender, v.start_date::DATE, v.end_date::DATE, v.active_passive, $2, $3, $4
        FROM JSONB_TO_RECORDSET($1::JSONB) AS v(${pool_register_types_1.poolColumns.map((key) => `${key} TEXT`).join(', ')})`, [
                JSON.stringify(rows.map((row) => row.values)),
                kind,
                actor,
                imported.rows[0].id,
            ]);
            await this.bump(client, kind);
            await client.query("UPDATE public.pool_register_previews SET status = 'committed' WHERE id = $1", [id]);
            return { importedRows: rows.length, replacedRows };
        });
    }
};
exports.PoolRegisterService = PoolRegisterService;
exports.PoolRegisterService = PoolRegisterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], PoolRegisterService);
//# sourceMappingURL=pool-register.service.js.map