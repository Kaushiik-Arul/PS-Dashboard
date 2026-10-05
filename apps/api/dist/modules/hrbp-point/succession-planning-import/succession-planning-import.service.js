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
exports.SuccessionPlanningImportService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../../database/database.service");
const succession_planning_import_parser_1 = require("./succession-planning-import.parser");
const succession_planning_import_types_1 = require("./succession-planning-import.types");
let SuccessionPlanningImportService = class SuccessionPlanningImportService {
    database;
    constructor(database) {
        this.database = database;
    }
    uuid(id) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
            throw new common_1.BadRequestException('Invalid preview ID.');
    }
    async jdLookup(client, values) {
        const suffixes = [
            ...new Set(values
                .filter((value) => value.length >= 3)
                .map((value) => value.slice(-3).toLocaleLowerCase('en-US'))),
        ];
        const matches = new Map();
        const ambiguousSuffixes = new Set();
        if (!suffixes.length)
            return { matches, ambiguousSuffixes };
        const result = await client.query(`SELECT jd_id FROM public.job_descriptions
       WHERE LOWER(RIGHT(jd_id, 3)) = ANY($1::TEXT[])`, [suffixes]);
        for (const row of result.rows) {
            const suffix = row.jd_id.slice(-3).toLocaleLowerCase('en-US');
            if (matches.has(suffix))
                ambiguousSuffixes.add(suffix);
            else
                matches.set(suffix, row.jd_id);
        }
        ambiguousSuffixes.forEach((suffix) => matches.delete(suffix));
        return { matches, ambiguousSuffixes };
    }
    async lockState(client) {
        const result = await client.query(`SELECT revision::TEXT AS revision
       FROM public.succession_planning_state
       WHERE singleton = TRUE FOR UPDATE`);
        return result.rows[0].revision;
    }
    async previewLock(client, actor, id) {
        this.uuid(id);
        const result = await client.query(`SELECT file_name, file_hash, base_revision::TEXT AS base_revision
       FROM public.succession_planning_previews
       WHERE id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`, [id, actor]);
        if (!result.rows[0])
            throw new common_1.NotFoundException('Preview expired or was not found. Upload the workbook again.');
        return result.rows[0];
    }
    async validatedRows(client, id) {
        const found = await client.query(`SELECT row_number, row_data
       FROM public.succession_planning_preview_rows
       WHERE preview_id = $1 ORDER BY row_number`, [id]);
        const rows = found.rows.map((row) => ({
            rowNumber: row.row_number,
            values: row.row_data,
            issues: [],
        }));
        const jdIds = rows.flatMap((row) => [
            row.values.position_jd_id,
            row.values.successor1_current_jd_id,
            row.values.successor2_current_jd_id,
        ]);
        return (0, succession_planning_import_parser_1.validateSuccessionPlanningRows)(rows, await this.jdLookup(client, jdIds));
    }
    async upload(actor, file) {
        if (!file)
            throw new common_1.BadRequestException('Choose a Succession Planning XLSX workbook.');
        if (file.buffer.length > 50 * 1024 * 1024)
            throw new common_1.BadRequestException('File exceeds 50 MB.');
        const rows = await (0, succession_planning_import_parser_1.parseSuccessionPlanningFile)(file);
        return this.database.transaction(async (client) => {
            const revision = await this.lockState(client);
            const preview = await client.query(`INSERT INTO public.succession_planning_previews
           (base_revision, uploaded_by, file_name, file_hash)
         VALUES ($1, $2, $3, $4) RETURNING id`, [
                revision,
                actor,
                file.originalname,
                (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex'),
            ]);
            const id = preview.rows[0].id;
            await client.query(`INSERT INTO public.succession_planning_preview_rows
           (preview_id, row_number, row_data)
         SELECT $1, item.row_number, item.row_data
         FROM JSONB_TO_RECORDSET($2::JSONB) AS item(
           row_number INTEGER, row_data JSONB
         )`, [
                id,
                JSON.stringify(rows.map((row) => ({
                    row_number: row.rowNumber,
                    row_data: row.values,
                }))),
            ]);
            return { id };
        });
    }
    async preview(actor, id, filter = 'all', pageInput = '1') {
        if (!['all', 'warnings'].includes(filter))
            throw new common_1.BadRequestException('Invalid preview filter.');
        if (!/^[1-9]\d{0,4}$/.test(pageInput))
            throw new common_1.BadRequestException('Invalid preview page.');
        return this.database.transaction(async (client) => {
            const preview = await this.previewLock(client, actor, id);
            const rows = await this.validatedRows(client, id);
            const warningsByEmployee = new Map();
            const warningSummariesByEmployee = new Map();
            for (const row of rows) {
                for (const issue of row.issues) {
                    const employeeNumber = issue.employeeNumber;
                    if (!warningsByEmployee.has(employeeNumber))
                        warningsByEmployee.set(employeeNumber, { ...row, issues: [issue] });
                    const successor = issue.column === 'successor1_pers_no' ? 1 : 2;
                    const employeeName = successor === 1
                        ? row.values.successor1_name
                        : row.values.successor2_name;
                    const summary = warningSummariesByEmployee.get(employeeNumber) ?? {
                        employeeNumber,
                        employeeName,
                        occurrences: issue.occurrences,
                        assignments: [],
                    };
                    if (!summary.employeeName && employeeName)
                        summary.employeeName = employeeName;
                    summary.assignments.push({
                        rowNumber: row.rowNumber,
                        successor,
                        area: row.values.area,
                        positionJdId: row.values.position_jd_id,
                        jdName: row.values.jd_name,
                        deptCode: successor === 1
                            ? row.values.successor1_dept_code
                            : row.values.successor2_dept_code,
                        currentJdId: successor === 1
                            ? row.values.successor1_current_jd_id
                            : row.values.successor2_current_jd_id,
                        readiness: successor === 1
                            ? row.values.successor1_readiness
                            : row.values.successor2_readiness,
                        rating: successor === 1
                            ? row.values.successor1_9_box_rating
                            : row.values.successor2_9_box_rating,
                        idpStatus: successor === 1
                            ? row.values.successor1_idp_status
                            : row.values.successor2_idp_status,
                    });
                    warningSummariesByEmployee.set(employeeNumber, summary);
                }
            }
            const warningRows = warningsByEmployee.size;
            const warningSummaries = [...warningSummariesByEmployee.values()];
            const selected = filter === 'warnings' ? [...warningsByEmployee.values()] : rows;
            const page = Math.min(Number(pageInput), Math.max(1, Math.ceil(selected.length / 25)));
            const existing = await client.query(`SELECT COUNT(*)::TEXT AS count
         FROM public.succession_planning_rows`);
            return {
                id,
                fileName: preview.file_name,
                totalRows: rows.length,
                warningRows,
                existingRows: Number(existing.rows[0].count),
                filteredRows: selected.length,
                page,
                rows: selected.slice((page - 1) * 25, page * 25),
                warningSummaries: filter === 'warnings'
                    ? warningSummaries.slice((page - 1) * 25, page * 25)
                    : [],
            };
        });
    }
    async editPreview(actor, id, rowInput, input) {
        if (!/^[1-9]\d{0,5}$/.test(rowInput))
            throw new common_1.BadRequestException('Invalid Excel row number.');
        const values = input === undefined ? undefined : (0, succession_planning_import_parser_1.cleanSuccessionPlanningValues)(input);
        await this.database.transaction(async (client) => {
            await this.previewLock(client, actor, id);
            if (!values) {
                const count = await client.query(`SELECT COUNT(*)::TEXT AS count
           FROM public.succession_planning_preview_rows
           WHERE preview_id = $1`, [id]);
                if (Number(count.rows[0].count) <= 1)
                    throw new common_1.ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
            }
            const result = values
                ? await client.query(`UPDATE public.succession_planning_preview_rows
             SET row_data = $3::JSONB
             WHERE preview_id = $1 AND row_number = $2`, [id, Number(rowInput), JSON.stringify(values)])
                : await client.query(`DELETE FROM public.succession_planning_preview_rows
             WHERE preview_id = $1 AND row_number = $2`, [id, Number(rowInput)]);
            if (!result.rowCount)
                throw new common_1.NotFoundException('Preview row was not found.');
        });
    }
    async cancel(actor, id) {
        await this.database.transaction(async (client) => {
            await this.previewLock(client, actor, id);
            await client.query('DELETE FROM public.succession_planning_previews WHERE id = $1', [id]);
        });
    }
    async commit(actor, id, confirmed) {
        if (confirmed !== true)
            throw new common_1.BadRequestException('Confirm replacement of every current Succession Planning row.');
        return this.database.transaction(async (client) => {
            const revision = await this.lockState(client);
            const preview = await this.previewLock(client, actor, id);
            if (preview.base_revision !== revision)
                throw new common_1.ConflictException('The register changed after this preview. Upload the workbook again.');
            const rows = await this.validatedRows(client, id);
            if (!rows.length)
                throw new common_1.ConflictException('The preview does not contain any rows.');
            const existing = await client.query('SELECT COUNT(*)::TEXT AS count FROM public.succession_planning_rows');
            const replacedRows = Number(existing.rows[0].count);
            const imported = await client.query(`INSERT INTO public.succession_planning_imports
           (file_name, file_hash, row_count, replaced_rows, imported_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`, [
                preview.file_name,
                preview.file_hash,
                rows.length,
                replacedRows,
                actor,
            ]);
            await client.query('DELETE FROM public.succession_planning_rows');
            await client.query(`INSERT INTO public.succession_planning_rows (
           ${succession_planning_import_types_1.successionPlanningColumns.join(', ')},
           import_id, updated_by_account_id
         )
         SELECT
           v.entity, v.updated_by_name, v.area, v.position_jd_id, v.jd_name,
           v.ipe_level, v.employee_subgroup, v.criticality, v.priority,
           v.incumbent_pers_no, v.incumbent_name,
           v.incumbent_org_unit, v.incumbent_range,
           v.incumbent_tenure_years,
           v.incumbent_age,
           v.incumbent_change_year,
           v.incumbent_9_box_rating, v.reason_for_change,
           v.successor1_pers_no, v.successor1_name,
           v.successor1_dept_code, v.successor1_current_jd_id,
           v.successor1_readiness, v.successor1_9_box_rating,
           v.successor1_idp_status,
           v.successor2_pers_no, v.successor2_name,
           v.successor2_dept_code, v.successor2_current_jd_id,
           v.successor2_readiness, v.successor2_9_box_rating,
           v.successor2_idp_status, $2::UUID, $3::UUID
         FROM JSONB_TO_RECORDSET($1::JSONB) AS v(
           ${succession_planning_import_types_1.successionPlanningColumns.map((column) => `${column} TEXT`).join(', ')}
         )`, [
                JSON.stringify(rows.map((row) => row.values)),
                imported.rows[0].id,
                actor,
            ]);
            await client.query(`UPDATE public.succession_planning_state
         SET revision = revision + 1 WHERE singleton = TRUE`);
            await client.query(`UPDATE public.succession_planning_previews
         SET status = 'committed' WHERE id = $1`, [id]);
            return { importedRows: rows.length, replacedRows };
        });
    }
};
exports.SuccessionPlanningImportService = SuccessionPlanningImportService;
exports.SuccessionPlanningImportService = SuccessionPlanningImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], SuccessionPlanningImportService);
//# sourceMappingURL=succession-planning-import.service.js.map