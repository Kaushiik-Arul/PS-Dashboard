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
exports.MrmRepository = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../database/database.service");
function monthDate(month) {
    return `${month}-01`;
}
let MrmRepository = class MrmRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async listReports() {
        const result = await this.database.query(`SELECT TO_CHAR(reporting_month, 'YYYY-MM') AS reporting_month,
              TO_CHAR(data_month, 'YYYY-MM') AS data_month,
              status
       FROM public.mrm_reports ORDER BY reporting_month DESC`);
        return result.rows.map((row) => ({
            reportingMonth: row.reporting_month,
            dataMonth: row.data_month,
            status: row.status,
        }));
    }
    async getReport(reportingMonth) {
        const result = await this.database.query(`SELECT id::text, TO_CHAR(reporting_month, 'YYYY-MM') AS reporting_month,
              TO_CHAR(data_month, 'YYYY-MM') AS data_month, status,
              revision::text, updated_at::text, finalized_at::text
       FROM public.mrm_reports WHERE reporting_month = $1::date`, [monthDate(reportingMonth)]);
        return result.rows[0] ?? null;
    }
    async getRows(reportingMonth, reportId) {
        if (reportId) {
            const snapshot = await this.getSnapshot(reportId);
            if (snapshot) {
                const payload = snapshot;
                if (Array.isArray(payload.rows))
                    return payload.rows;
            }
        }
        const result = await this.database.query(`SELECT row_key, title, description, value_mode, highlighted, muted,
              emphasized, managed
       FROM public.mrm_row_definitions
       WHERE active_from_month <= $1::date
         AND (active_to_month IS NULL OR active_to_month >= $1::date)
       ORDER BY display_order, row_key`, [monthDate(reportingMonth)]);
        return result.rows;
    }
    async getColumns(reportingMonth, reportId) {
        if (reportId) {
            const result = await this.database.query(`SELECT columns.column_key, columns.label, columns.column_type,
                columns.managed, definitions.rolling_month_offset
         FROM public.mrm_report_columns columns
         LEFT JOIN public.mrm_column_definitions definitions
           ON definitions.column_key = columns.definition_key
         WHERE columns.report_id = $1::uuid
         ORDER BY columns.display_order, columns.column_key`, [reportId]);
            if (result.rowCount)
                return result.rows;
        }
        const result = await this.database.query(`SELECT column_key, label, column_type, managed, rolling_month_offset
       FROM public.mrm_column_definitions
       WHERE active_from_month <= $1::date
         AND (active_to_month IS NULL OR active_to_month >= $1::date)
       ORDER BY display_order, column_key`, [monthDate(reportingMonth)]);
        return result.rows;
    }
    async getCells(reportId) {
        if (!reportId)
            return [];
        const result = await this.database.query(`SELECT cells.row_key, columns.column_key, cells.value
       FROM public.mrm_cells cells
       INNER JOIN public.mrm_report_columns columns
         ON columns.id = cells.report_column_id
       WHERE cells.report_id = $1::uuid`, [reportId]);
        return result.rows;
    }
    async getAttachments(reportId) {
        if (!reportId)
            return [];
        const result = await this.database.query(`SELECT attachment.id::text, attachment.row_key, columns.column_key,
              attachment.original_filename, attachment.mime_type,
              attachment.size_bytes, attachment.uploaded_at::text
       FROM public.mrm_attachments attachment
       INNER JOIN public.mrm_report_columns columns
         ON columns.id = attachment.report_column_id
       WHERE attachment.report_id = $1::uuid
       ORDER BY attachment.uploaded_at, attachment.id`, [reportId]);
        return result.rows.map((row) => ({
            id: row.id,
            rowKey: row.row_key,
            columnId: row.column_key,
            filename: row.original_filename,
            mimeType: row.mime_type,
            size: row.size_bytes,
            uploadedAt: row.uploaded_at,
        }));
    }
    async getSnapshot(reportId) {
        const result = await this.database.query(`SELECT payload FROM public.mrm_report_snapshots WHERE report_id = $1::uuid`, [reportId]);
        return result.rows[0]?.payload ?? null;
    }
    async getScopedBuckets(reportId, accountId) {
        const result = await this.database.query(`SELECT bucket.metric_key,
              SUM(bucket.numerator)::text AS numerator,
              CASE WHEN BOOL_OR(bucket.denominator IS NOT NULL)
                THEN SUM(COALESCE(bucket.denominator, 0))::text END AS denominator,
              SUM(bucket.quality_count)::text AS quality_count
       FROM public.mrm_metric_snapshots bucket
       WHERE bucket.report_id = $1::uuid
         AND EXISTS (
           SELECT 1 FROM public.master_access access
           WHERE access.account_id = $2::uuid
             AND (
               access.role IN ('hrbp', 'admin')
               OR (access.role = 'range_head'
                 AND bucket.range_key = UPPER(REGEXP_REPLACE(BTRIM(access.assigned_range), '[[:space:]]+', ' ', 'g')))
               OR (access.role IN ('department_head', 'sub_department_head')
                 AND bucket.range_key = UPPER(REGEXP_REPLACE(BTRIM(access.assigned_range), '[[:space:]]+', ' ', 'g'))
                 AND bucket.org_unit_key = UPPER(REGEXP_REPLACE(BTRIM(access.assigned_org_unit), '[[:space:]]+', ' ', 'g')))
             )
         )
       GROUP BY bucket.metric_key ORDER BY bucket.metric_key`, [reportId, accountId]);
        return result.rows.map((row) => ({
            metricKey: row.metric_key,
            rangeKey: '',
            orgUnitKey: '',
            numerator: Number(row.numerator),
            denominator: row.denominator === null ? null : Number(row.denominator),
            qualityCount: Number(row.quality_count),
        }));
    }
    async saveDraft(reportingMonth, accountId, input) {
        const reportingDate = monthDate(reportingMonth);
        return this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('mrm:' || $1::text))`, [reportingMonth]);
            let report = await client.query(`SELECT id::text, revision::text, status FROM public.mrm_reports
         WHERE reporting_month = $1::date FOR UPDATE`, [reportingDate]);
            if (!report.rowCount) {
                if (input.expectedRevision !== 0)
                    throw new common_1.ConflictException('MRM report revision conflict.');
                report = await client.query(`INSERT INTO public.mrm_reports (
             reporting_month, data_month, created_by, updated_by
           ) VALUES ($1::date, ($1::date - INTERVAL '1 month')::date, $2::uuid, $2::uuid)
           RETURNING id::text, revision::text, status`, [reportingDate, accountId]);
            }
            const current = report.rows[0];
            if (!current || current.status === 'finalized') {
                throw new common_1.ConflictException('Finalized MRM reports cannot be changed.');
            }
            if (Number(current.revision) !== input.expectedRevision) {
                throw new common_1.ConflictException('MRM report revision conflict.');
            }
            await this.saveLayout(client, current.id, accountId, input);
            const updated = await client.query(`UPDATE public.mrm_reports
         SET revision = revision + 1, updated_by = $2::uuid, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1::uuid RETURNING revision::text`, [current.id, accountId]);
            await client.query(`INSERT INTO public.mrm_audit_events (report_id, actor_account_id, event_type, event_details)
         VALUES ($1::uuid, $2::uuid, 'draft_saved', JSONB_BUILD_OBJECT('revision', $3::bigint))`, [current.id, accountId, updated.rows[0]?.revision]);
            return Number(updated.rows[0]?.revision);
        });
    }
    async saveLayout(client, reportId, accountId, input) {
        for (const [index, row] of input.rows.entries()) {
            await client.query(`INSERT INTO public.mrm_row_definitions (
           row_key, title, description, value_mode, display_order,
           highlighted, muted, emphasized, active_from_month, managed
         ) VALUES ($1, $2, $3, 'manual', $4, $5, $6, $7, DATE '2025-01-01', FALSE)
         ON CONFLICT (row_key) DO UPDATE SET
           display_order = EXCLUDED.display_order,
           title = CASE WHEN NOT public.mrm_row_definitions.managed THEN EXCLUDED.title ELSE public.mrm_row_definitions.title END,
           description = CASE WHEN NOT public.mrm_row_definitions.managed THEN EXCLUDED.description ELSE public.mrm_row_definitions.description END,
           highlighted = EXCLUDED.highlighted, muted = EXCLUDED.muted,
           emphasized = EXCLUDED.emphasized`, [row.key, row.title, row.description, index, row.highlighted, row.muted, row.emphasized]);
        }
        for (const [index, column] of input.columns.entries()) {
            await client.query(`INSERT INTO public.mrm_report_columns (
           report_id, column_key, definition_key, label, column_type, display_order, managed
         ) VALUES (
           $1::uuid, $2,
           CASE WHEN $5 THEN $2 ELSE NULL END,
           $3, $4, $6, $5
         )
         ON CONFLICT (report_id, column_key) DO UPDATE SET
           label = CASE WHEN NOT public.mrm_report_columns.managed THEN EXCLUDED.label ELSE public.mrm_report_columns.label END,
           column_type = CASE WHEN NOT public.mrm_report_columns.managed THEN EXCLUDED.column_type ELSE public.mrm_report_columns.column_type END,
           display_order = EXCLUDED.display_order`, [reportId, column.key, column.label, column.type, column.managed, index]);
        }
        const retainedColumns = input.columns.map((column) => column.key);
        await client.query(`DELETE FROM public.mrm_report_columns
       WHERE report_id = $1::uuid AND NOT managed
         AND NOT (column_key = ANY($2::text[]))`, [reportId, retainedColumns]);
        await client.query(`DELETE FROM public.mrm_cells cells
       USING public.mrm_row_definitions rows
       WHERE cells.report_id = $1::uuid AND cells.row_key = rows.row_key
         AND rows.value_mode = 'manual'`, [reportId]);
        const columnByKey = await client.query(`SELECT id::text, column_key FROM public.mrm_report_columns WHERE report_id = $1::uuid`, [reportId]);
        const columnIds = new Map(columnByKey.rows.map((column) => [column.column_key, column.id]));
        const rowModes = await client.query(`SELECT row_key, value_mode FROM public.mrm_row_definitions
       WHERE row_key = ANY($1::text[])`, [input.rows.map((row) => row.key)]);
        const manualRows = new Set(rowModes.rows.filter((row) => row.value_mode === 'manual').map((row) => row.row_key));
        for (const row of input.rows) {
            if (!manualRows.has(row.key))
                continue;
            for (const [columnKey, value] of Object.entries(row.cells)) {
                const columnId = columnIds.get(columnKey);
                if (!columnId || value === undefined || value === null || value === '')
                    continue;
                await client.query(`INSERT INTO public.mrm_cells (
             report_id, row_key, report_column_id, value, value_source, updated_by
           ) VALUES ($1::uuid, $2, $3::uuid, $4::jsonb, 'manual', $5::uuid)`, [reportId, row.key, columnId, JSON.stringify(value), accountId]);
            }
        }
    }
    async finalize(reportId, accountId, expectedRevision, buckets, payload) {
        await this.database.transaction(async (client) => {
            await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('mrm-finalize:' || $1::text))`, [reportId]);
            const report = await client.query(`SELECT status, revision::text FROM public.mrm_reports WHERE id = $1::uuid FOR UPDATE`, [reportId]);
            const current = report.rows[0];
            if (!current)
                throw new common_1.NotFoundException('MRM report not found.');
            if (current.status === 'finalized')
                return;
            if (Number(current.revision) !== expectedRevision) {
                throw new common_1.ConflictException('MRM report revision conflict.');
            }
            for (const bucket of buckets) {
                await client.query(`INSERT INTO public.mrm_metric_snapshots (
             report_id, metric_key, range_key, org_unit_key,
             numerator, denominator, quality_count
           ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`, [reportId, bucket.metricKey, bucket.rangeKey, bucket.orgUnitKey,
                    bucket.numerator, bucket.denominator, bucket.qualityCount]);
            }
            const nextRevision = expectedRevision + 1;
            const finalizedPayload = {
                ...payload,
                status: 'finalized',
                revision: nextRevision,
            };
            const payloadJson = JSON.stringify(finalizedPayload);
            const checksum = (0, node_crypto_1.createHash)('sha256').update(payloadJson).digest('hex');
            await client.query(`INSERT INTO public.mrm_report_snapshots (
           report_id, payload, checksum, created_by
         ) VALUES (
           $1::uuid, $2::jsonb, $3, $4::uuid
         )`, [reportId, payloadJson, checksum, accountId]);
            await client.query(`UPDATE public.mrm_reports SET status = 'finalized', revision = $3,
           finalized_by = $2::uuid, finalized_at = CURRENT_TIMESTAMP,
           updated_by = $2::uuid, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1::uuid`, [reportId, accountId, nextRevision]);
            await client.query(`INSERT INTO public.mrm_audit_events (report_id, actor_account_id, event_type, event_details)
         VALUES ($1::uuid, $2::uuid, 'report_finalized', JSONB_BUILD_OBJECT('revision', $3::bigint))`, [reportId, accountId, nextRevision]);
        });
    }
    async addAttachment(reportId, rowKey, columnKey, accountId, file, safeFilename, sha256) {
        const result = await this.database.query(`WITH inserted AS (
         INSERT INTO public.mrm_attachments (
           report_id, row_key, report_column_id, original_filename, safe_filename,
           mime_type, size_bytes, sha256, content, uploaded_by
         )
         SELECT $1::uuid, $2, columns.id, $4, $5, $6, $7, $8, $9, $10::uuid
         FROM public.mrm_report_columns columns
         INNER JOIN public.mrm_reports report ON report.id = columns.report_id
         WHERE columns.report_id = $1::uuid AND columns.column_key = $3
           AND columns.column_type = 'attachment' AND report.status = 'draft'
         RETURNING id
       ), audit AS (
         INSERT INTO public.mrm_audit_events (report_id, actor_account_id, event_type, event_details)
         SELECT $1::uuid, $10::uuid, 'attachment_uploaded',
                JSONB_BUILD_OBJECT('attachmentId', id, 'size', $7::integer)
         FROM inserted
       ) SELECT id::text FROM inserted`, [reportId, rowKey, columnKey, file.originalname, safeFilename,
            file.mimetype, file.size, sha256, file.buffer, accountId]);
        const id = result.rows[0]?.id;
        if (!id)
            throw new common_1.ConflictException('Attachment target is not an editable draft cell.');
        return id;
    }
    async getAttachment(reportId, attachmentId, accountId) {
        const result = await this.database.query(`SELECT attachment.original_filename AS filename, attachment.mime_type,
              attachment.size_bytes, attachment.content
       FROM public.mrm_attachments attachment
       INNER JOIN public.mrm_reports report ON report.id = attachment.report_id
       WHERE report.id = $1::uuid AND attachment.id = $2::uuid
         AND EXISTS (
           SELECT 1 FROM public.master_access access WHERE access.account_id = $3::uuid
         )`, [reportId, attachmentId, accountId]);
        return result.rows[0] ?? null;
    }
    async deleteAttachment(reportId, attachmentId, accountId) {
        const result = await this.database.query(`WITH deleted AS (
         DELETE FROM public.mrm_attachments attachment
         USING public.mrm_reports report
         WHERE attachment.id = $2::uuid AND attachment.report_id = $1::uuid
           AND report.id = attachment.report_id AND report.status = 'draft'
         RETURNING attachment.id
       )
       INSERT INTO public.mrm_audit_events (report_id, actor_account_id, event_type, event_details)
       SELECT $1::uuid, $3::uuid, 'attachment_deleted',
              JSONB_BUILD_OBJECT('attachmentId', id) FROM deleted`, [reportId, attachmentId, accountId]);
        if (!result.rowCount)
            throw new common_1.NotFoundException('Draft attachment not found.');
    }
};
exports.MrmRepository = MrmRepository;
exports.MrmRepository = MrmRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], MrmRepository);
//# sourceMappingURL=mrm.repository.js.map