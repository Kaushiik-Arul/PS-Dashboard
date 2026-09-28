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
exports.EmployeeJdImportRepository = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../../database/database.service");
const employee_jd_import_types_1 = require("./employee-jd-import.types");
let EmployeeJdImportRepository = class EmployeeJdImportRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getKnownPersNos(persNos) {
        if (!persNos.length)
            return new Set();
        const result = await this.database.query('SELECT pers_no::TEXT AS pers_no FROM public.employee_namelist WHERE pers_no = ANY($1::BIGINT[])', [persNos]);
        return new Set(result.rows.map((row) => row.pers_no));
    }
    async getKnownJdIds(jdIds) {
        if (!jdIds.length)
            return new Map();
        const result = await this.database.query('SELECT jd_id FROM public.job_descriptions WHERE LOWER(RIGHT(jd_id, 3)) = ANY($1::TEXT[])', [jdIds.map((value) => value.slice(-3).toLowerCase())]);
        const matches = new Map();
        const ambiguousSuffixes = new Set();
        for (const row of result.rows) {
            const suffix = row.jd_id.slice(-3).toLowerCase();
            if (matches.has(suffix))
                ambiguousSuffixes.add(suffix);
            else
                matches.set(suffix, row.jd_id);
        }
        ambiguousSuffixes.forEach((suffix) => matches.delete(suffix));
        return matches;
    }
    async createPreview(actorAccountId, file, rows) {
        return this.database.transaction(async (client) => {
            await client.query(`DELETE FROM public.employee_jd_import_previews WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP`);
            const validRows = rows.filter((row) => !(0, employee_jd_import_types_1.hasBlockingEmployeeJdIssues)(row.issues)).length;
            const preview = await client.query(`INSERT INTO public.employee_jd_import_previews (
           uploaded_by, file_name, file_hash, total_rows, valid_rows, invalid_rows
         ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING preview_id`, [actorAccountId, file.originalname, (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex'), rows.length, validRows, rows.length - validRows]);
            const previewId = preview.rows[0].preview_id;
            for (let offset = 0; offset < rows.length; offset += 500) {
                const payload = rows.slice(offset, offset + 500).map((row) => ({
                    row_number: row.rowNumber,
                    row_data: row.values,
                    issues: row.issues,
                    is_valid: !(0, employee_jd_import_types_1.hasBlockingEmployeeJdIssues)(row.issues),
                }));
                await client.query(`INSERT INTO public.employee_jd_import_preview_rows
             (preview_id, row_number, row_data, issues, is_valid)
           SELECT $1, item.row_number, item.row_data, item.issues, item.is_valid
           FROM JSONB_TO_RECORDSET($2::JSONB) AS item(
             row_number INTEGER, row_data JSONB, issues JSONB, is_valid BOOLEAN
           )`, [previewId, JSON.stringify(payload)]);
            }
            return previewId;
        });
    }
    async getSummary(previewId, actorAccountId) {
        const result = await this.database.query(`SELECT preview_id, file_name, file_hash, total_rows, valid_rows, invalid_rows
       FROM public.employee_jd_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP`, [previewId, actorAccountId]);
        if (!result.rows[0])
            return null;
        const [hasExistingAssignments, warningCount] = await Promise.all([
            this.hasExistingAssignments(),
            this.database.query(`SELECT COUNT(*)::TEXT AS count FROM public.employee_jd_import_preview_rows
         WHERE preview_id = $1 AND is_valid AND row_data->>'jd_id' = ''`, [previewId]),
        ]);
        return this.buildSummary(result.rows[0], hasExistingAssignments, Number(warningCount.rows[0]?.count ?? 0));
    }
    async getRows(previewId, actorAccountId, filter, page, pageSize) {
        const summary = await this.getSummary(previewId, actorAccountId);
        if (!summary)
            return null;
        const validity = filter === 'all' || filter === 'warning' ? null : filter === 'valid';
        const warningOnly = filter === 'warning';
        const cleanOnly = filter === 'valid';
        const [rows, count] = await Promise.all([
            this.database.query(`SELECT row_number, row_data, issues FROM public.employee_jd_import_preview_rows
         WHERE preview_id = $1 AND ($2::BOOLEAN IS NULL OR is_valid = $2)
           AND (NOT $3::BOOLEAN OR (is_valid AND row_data->>'jd_id' = ''))
           AND (NOT $4::BOOLEAN OR row_data->>'jd_id' <> '')
         ORDER BY row_number LIMIT $5 OFFSET $6`, [previewId, validity, warningOnly, cleanOnly, pageSize, (page - 1) * pageSize]),
            this.database.query(`SELECT COUNT(*)::TEXT AS count FROM public.employee_jd_import_preview_rows
         WHERE preview_id = $1 AND ($2::BOOLEAN IS NULL OR is_valid = $2)
           AND (NOT $3::BOOLEAN OR (is_valid AND row_data->>'jd_id' = ''))
           AND (NOT $4::BOOLEAN OR row_data->>'jd_id' <> '')`, [previewId, validity, warningOnly, cleanOnly]),
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
        const result = await this.database.query(`SELECT row_number, row_data, issues FROM public.employee_jd_import_preview_rows
       WHERE preview_id = $1 ORDER BY row_number`, [previewId]);
        return result.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data, issues: row.issues }));
    }
    async replaceRows(previewId, actorAccountId, rows) {
        const payload = rows.map((row) => ({ row_number: row.rowNumber, row_data: row.values, issues: row.issues, is_valid: !(0, employee_jd_import_types_1.hasBlockingEmployeeJdIssues)(row.issues) }));
        const validRows = rows.filter((row) => !(0, employee_jd_import_types_1.hasBlockingEmployeeJdIssues)(row.issues)).length;
        await this.database.transaction(async (client) => {
            const preview = await client.query(`SELECT 1 FROM public.employee_jd_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [previewId, actorAccountId]);
            if (!preview.rowCount)
                throw new Error('PREVIEW_NOT_FOUND');
            await client.query(`UPDATE public.employee_jd_import_preview_rows target
         SET row_data = source.row_data, issues = source.issues, is_valid = source.is_valid
         FROM JSONB_TO_RECORDSET($2::JSONB) AS source(
           row_number INTEGER, row_data JSONB, issues JSONB, is_valid BOOLEAN
         ) WHERE target.preview_id = $1 AND target.row_number = source.row_number`, [previewId, JSON.stringify(payload)]);
            await client.query(`UPDATE public.employee_jd_import_previews
         SET valid_rows = $2, invalid_rows = total_rows - $2 WHERE preview_id = $1`, [previewId, validRows]);
        });
    }
    async deleteRow(previewId, actorAccountId, rowNumber) {
        return this.database.transaction(async (client) => {
            const preview = await client.query(`SELECT total_rows FROM public.employee_jd_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [previewId, actorAccountId]);
            if (!preview.rows[0])
                throw new Error('PREVIEW_NOT_FOUND');
            if (preview.rows[0].total_rows <= 1)
                throw new Error('LAST_PREVIEW_ROW');
            const deleted = await client.query(`DELETE FROM public.employee_jd_import_preview_rows
         WHERE preview_id = $1 AND row_number = $2
         RETURNING row_data`, [previewId, rowNumber]);
            const deletedRow = deleted.rows[0];
            if (!deletedRow)
                return false;
            const sameEmployeeRows = await client.query(`SELECT row_number, row_data, issues FROM public.employee_jd_import_preview_rows
         WHERE preview_id = $1 AND row_data->>'pers_no' = $2
         FOR UPDATE`, [previewId, deletedRow.row_data.pers_no]);
            if (sameEmployeeRows.rows.length === 1) {
                const remaining = sameEmployeeRows.rows[0];
                const issues = remaining.issues.filter((issue) => !(issue.column === 'pers_no' && issue.message === 'Employee number is duplicated in this workbook.'));
                if (issues.length !== remaining.issues.length) {
                    await client.query(`UPDATE public.employee_jd_import_preview_rows
             SET issues = $3::JSONB, is_valid = $4
             WHERE preview_id = $1 AND row_number = $2`, [previewId, remaining.row_number, JSON.stringify(issues), !(0, employee_jd_import_types_1.hasBlockingEmployeeJdIssues)(issues)]);
                }
            }
            await client.query(`UPDATE public.employee_jd_import_previews
         SET total_rows = counts.total_rows,
             valid_rows = counts.valid_rows,
             invalid_rows = counts.total_rows - counts.valid_rows
         FROM (
           SELECT COUNT(*)::INT AS total_rows,
                  COUNT(*) FILTER (WHERE is_valid)::INT AS valid_rows
           FROM public.employee_jd_import_preview_rows WHERE preview_id = $1
         ) counts
         WHERE employee_jd_import_previews.preview_id = $1`, [previewId]);
            return true;
        });
    }
    async cancel(previewId, actorAccountId) {
        const result = await this.database.query(`DELETE FROM public.employee_jd_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'`, [previewId, actorAccountId]);
        return (result.rowCount ?? 0) > 0;
    }
    async commit(previewId, actorAccountId, confirmReplacement) {
        return this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('employee_jd_assignment_import'))`);
            const preview = await client.query(`SELECT preview_id, file_name, file_hash, total_rows, valid_rows, invalid_rows
         FROM public.employee_jd_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [previewId, actorAccountId]);
            const record = preview.rows[0];
            if (!record)
                throw new Error('PREVIEW_NOT_FOUND');
            if (record.invalid_rows > 0)
                throw new Error('INVALID_ROWS');
            if ((await this.hasExistingAssignments(client)) && !confirmReplacement) {
                throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');
            }
            const stillValid = await client.query(`SELECT COUNT(*)::TEXT AS count
         FROM public.employee_jd_import_preview_rows preview_row
         JOIN public.employee_namelist employee
           ON employee.pers_no = (preview_row.row_data->>'pers_no')::BIGINT
         LEFT JOIN public.job_descriptions job
           ON LOWER(job.jd_id) = LOWER(preview_row.row_data->>'jd_id')
         WHERE preview_row.preview_id = $1 AND preview_row.is_valid
           AND (preview_row.row_data->>'jd_id' = '' OR job.jd_id IS NOT NULL)`, [previewId]);
            if (Number(stillValid.rows[0]?.count ?? 0) !== record.total_rows) {
                throw new Error('STALE_PREVIEW');
            }
            const importResult = await client.query(`INSERT INTO public.employee_jd_imports (
           imported_by, file_name, file_hash, total_rows, status
         ) VALUES ($1, $2, $3, $4, 'processing') RETURNING import_id::TEXT`, [actorAccountId, record.file_name, record.file_hash, record.total_rows]);
            const importId = importResult.rows[0].import_id;
            const movements = await client.query(`WITH incoming AS (
           SELECT (preview_row.row_data->>'pers_no')::BIGINT AS pers_no,
                  job.jd_id, job.role_title
           FROM public.employee_jd_import_preview_rows preview_row
           LEFT JOIN public.job_descriptions job
             ON LOWER(job.jd_id) = LOWER(preview_row.row_data->>'jd_id')
           WHERE preview_row.preview_id = $1 AND preview_row.is_valid
         ), current_assignments AS (
           SELECT assignment.pers_no, assignment.jd_id, job.role_title
           FROM public.employee_jd_assignments assignment
           LEFT JOIN public.job_descriptions job ON job.jd_id = assignment.jd_id
         )
         INSERT INTO public.employee_jd_movements (
           pers_no, old_jd_id, old_role_title, new_jd_id, new_role_title,
           effective_date, source, source_import_id, changed_by_account_id
         )
         SELECT COALESCE(current_assignments.pers_no, incoming.pers_no),
                current_assignments.jd_id, current_assignments.role_title,
                incoming.jd_id, incoming.role_title, CURRENT_DATE,
                'upload', $2, $3
         FROM current_assignments
         FULL OUTER JOIN incoming USING (pers_no)
         WHERE current_assignments.jd_id IS DISTINCT FROM incoming.jd_id`, [previewId, importId, actorAccountId]);
            await client.query('DELETE FROM public.employee_jd_assignments');
            await client.query(`INSERT INTO public.employee_jd_assignments (
           pers_no, jd_id, effective_date, source, source_import_id, updated_by_account_id
         ) SELECT (preview_row.row_data->>'pers_no')::BIGINT, job.jd_id,
                  CURRENT_DATE, 'upload', $2, $3
           FROM public.employee_jd_import_preview_rows preview_row
           LEFT JOIN public.job_descriptions job
             ON LOWER(job.jd_id) = LOWER(preview_row.row_data->>'jd_id')
           WHERE preview_row.preview_id = $1 AND preview_row.is_valid
           ORDER BY preview_row.row_number`, [previewId, importId, actorAccountId]);
            await client.query(`UPDATE public.employee_jd_imports
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE import_id = $1`, [importId]);
            await client.query(`UPDATE public.employee_jd_import_previews SET status = 'committed' WHERE preview_id = $1`, [previewId]);
            await client.query(`INSERT INTO public.security_audit_log (event_type, actor_account_id, event_details)
         VALUES ('employee_jd_import_committed', $1, $2)`, [actorAccountId, { importId, totalRows: record.total_rows, movements: movements.rowCount ?? 0 }]);
            return { totalRows: record.total_rows, movements: movements.rowCount ?? 0 };
        });
    }
    buildSummary(record, hasExistingAssignments, warningRows) {
        return {
            id: record.preview_id,
            fileName: record.file_name,
            totalRows: record.total_rows,
            validRows: record.valid_rows,
            invalidRows: record.invalid_rows,
            warningRows,
            hasExistingAssignments,
        };
    }
    async hasExistingAssignments(client = this.database) {
        const result = await client.query('SELECT EXISTS (SELECT 1 FROM public.employee_jd_assignments) AS exists');
        return result.rows[0]?.exists ?? false;
    }
};
exports.EmployeeJdImportRepository = EmployeeJdImportRepository;
exports.EmployeeJdImportRepository = EmployeeJdImportRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EmployeeJdImportRepository);
//# sourceMappingURL=employee-jd-import.repository.js.map