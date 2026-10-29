import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import type {
  MrmAttachment,
  MrmMetricBucket,
  MrmSaveInput,
  MrmUploadedFile,
} from './mrm.types';

function monthDate(month: string): string {
  return `${month}-01`;
}

export type MrmReportRecord = {
  id: string;
  reporting_month: string;
  data_month: string;
  status: 'draft' | 'finalized';
  revision: string;
  updated_at: string;
  finalized_at: string | null;
};

export type MrmRowDefinitionRecord = {
  row_key: string;
  title: string;
  description: string;
  value_mode: 'manual' | 'calculated';
  highlighted: boolean;
  muted: boolean;
  emphasized: boolean;
  managed: boolean;
};

export type MrmColumnRecord = {
  column_key: string;
  label: string;
  column_type: 'value' | 'status' | 'attachment';
  managed: boolean;
  rolling_month_offset: number | null;
};

export type MrmCellRecord = {
  row_key: string;
  column_key: string;
  value: unknown;
};

@Injectable()
export class MrmRepository {
  constructor(private readonly database: DatabaseService) {}

  async listReports(): Promise<Array<{
    reportingMonth: string;
    dataMonth: string;
    status: 'draft' | 'finalized';
  }>> {
    const result = await this.database.query<{
      reporting_month: string;
      data_month: string;
      status: 'draft' | 'finalized';
    }>(
      `SELECT TO_CHAR(reporting_month, 'YYYY-MM') AS reporting_month,
              TO_CHAR(data_month, 'YYYY-MM') AS data_month,
              status
       FROM public.mrm_reports ORDER BY reporting_month DESC`,
    );
    return result.rows.map((row) => ({
      reportingMonth: row.reporting_month,
      dataMonth: row.data_month,
      status: row.status,
    }));
  }

  async getReport(reportingMonth: string): Promise<MrmReportRecord | null> {
    const result = await this.database.query<MrmReportRecord>(
      `SELECT id::text, TO_CHAR(reporting_month, 'YYYY-MM') AS reporting_month,
              TO_CHAR(data_month, 'YYYY-MM') AS data_month, status,
              revision::text, updated_at::text, finalized_at::text
       FROM public.mrm_reports WHERE reporting_month = $1::date`,
      [monthDate(reportingMonth)],
    );
    return result.rows[0] ?? null;
  }

  async getRows(
    reportingMonth: string,
    reportId: string | null,
  ): Promise<MrmRowDefinitionRecord[]> {
    if (reportId) {
      const snapshot = await this.getSnapshot(reportId);
      if (snapshot) {
        const payload = snapshot as { rows?: MrmRowDefinitionRecord[] };
        if (Array.isArray(payload.rows)) return payload.rows;
      }
    }
    const result = await this.database.query<MrmRowDefinitionRecord>(
      `SELECT row_key, title, description, value_mode, highlighted, muted,
              emphasized, managed
       FROM public.mrm_row_definitions
       WHERE active_from_month <= $1::date
         AND (active_to_month IS NULL OR active_to_month >= $1::date)
       ORDER BY display_order, row_key`,
      [monthDate(reportingMonth)],
    );
    return result.rows;
  }

  async getColumns(
    reportingMonth: string,
    reportId: string | null,
  ): Promise<MrmColumnRecord[]> {
    if (reportId) {
      const result = await this.database.query<MrmColumnRecord>(
        `SELECT columns.column_key, columns.label, columns.column_type,
                columns.managed, definitions.rolling_month_offset
         FROM public.mrm_report_columns columns
         LEFT JOIN public.mrm_column_definitions definitions
           ON definitions.column_key = columns.definition_key
         WHERE columns.report_id = $1::uuid
         ORDER BY columns.display_order, columns.column_key`,
        [reportId],
      );
      if (result.rowCount) return result.rows;
    }
    const result = await this.database.query<MrmColumnRecord>(
      `SELECT column_key, label, column_type, managed, rolling_month_offset
       FROM public.mrm_column_definitions
       WHERE active_from_month <= $1::date
         AND (active_to_month IS NULL OR active_to_month >= $1::date)
       ORDER BY display_order, column_key`,
      [monthDate(reportingMonth)],
    );
    return result.rows;
  }

  async getCells(reportId: string | null): Promise<MrmCellRecord[]> {
    if (!reportId) return [];
    const result = await this.database.query<MrmCellRecord>(
      `SELECT cells.row_key, columns.column_key, cells.value
       FROM public.mrm_cells cells
       INNER JOIN public.mrm_report_columns columns
         ON columns.id = cells.report_column_id
       WHERE cells.report_id = $1::uuid`,
      [reportId],
    );
    return result.rows;
  }

  async getAttachments(reportId: string | null): Promise<MrmAttachment[]> {
    if (!reportId) return [];
    const result = await this.database.query<{
      id: string;
      row_key: string;
      column_key: string;
      original_filename: string;
      mime_type: string;
      size_bytes: number;
      uploaded_at: string;
    }>(
      `SELECT attachment.id::text, attachment.row_key, columns.column_key,
              attachment.original_filename, attachment.mime_type,
              attachment.size_bytes, attachment.uploaded_at::text
       FROM public.mrm_attachments attachment
       INNER JOIN public.mrm_report_columns columns
         ON columns.id = attachment.report_column_id
       WHERE attachment.report_id = $1::uuid
       ORDER BY attachment.uploaded_at, attachment.id`,
      [reportId],
    );
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

  async getSnapshot(reportId: string): Promise<unknown> {
    const result = await this.database.query<{ payload: unknown }>(
      `SELECT payload FROM public.mrm_report_snapshots WHERE report_id = $1::uuid`,
      [reportId],
    );
    return result.rows[0]?.payload ?? null;
  }

  async getScopedBuckets(reportId: string, accountId: string): Promise<MrmMetricBucket[]> {
    const result = await this.database.query<{
      metric_key: string;
      numerator: string;
      denominator: string | null;
      quality_count: string;
    }>(
      `SELECT bucket.metric_key,
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
       GROUP BY bucket.metric_key ORDER BY bucket.metric_key`,
      [reportId, accountId],
    );
    return result.rows.map((row) => ({
      metricKey: row.metric_key,
      rangeKey: '',
      orgUnitKey: '',
      numerator: Number(row.numerator),
      denominator: row.denominator === null ? null : Number(row.denominator),
      qualityCount: Number(row.quality_count),
    }));
  }

  async saveDraft(
    reportingMonth: string,
    accountId: string,
    input: MrmSaveInput,
  ): Promise<number> {
    const reportingDate = monthDate(reportingMonth);
    return this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('mrm:' || $1::text))`, [reportingMonth]);
      let report = await client.query<{ id: string; revision: string; status: string }>(
        `SELECT id::text, revision::text, status FROM public.mrm_reports
         WHERE reporting_month = $1::date FOR UPDATE`,
        [reportingDate],
      );
      if (!report.rowCount) {
        if (input.expectedRevision !== 0) throw new ConflictException('MRM report revision conflict.');
        report = await client.query<{ id: string; revision: string; status: string }>(
          `INSERT INTO public.mrm_reports (
             reporting_month, data_month, created_by, updated_by
           ) VALUES ($1::date, ($1::date - INTERVAL '1 month')::date, $2::uuid, $2::uuid)
           RETURNING id::text, revision::text, status`,
          [reportingDate, accountId],
        );
      }
      const current = report.rows[0];
      if (!current || current.status === 'finalized') {
        throw new ConflictException('Finalized MRM reports cannot be changed.');
      }
      if (Number(current.revision) !== input.expectedRevision) {
        throw new ConflictException('MRM report revision conflict.');
      }
      await this.saveLayout(client, current.id, accountId, input);
      const updated = await client.query<{ revision: string }>(
        `UPDATE public.mrm_reports
         SET revision = revision + 1, updated_by = $2::uuid, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1::uuid RETURNING revision::text`,
        [current.id, accountId],
      );
      await client.query(
        `INSERT INTO public.mrm_audit_events (report_id, actor_account_id, event_type, event_details)
         VALUES ($1::uuid, $2::uuid, 'draft_saved', JSONB_BUILD_OBJECT('revision', $3::bigint))`,
        [current.id, accountId, updated.rows[0]?.revision],
      );
      return Number(updated.rows[0]?.revision);
    });
  }

  private async saveLayout(
    client: PoolClient,
    reportId: string,
    accountId: string,
    input: MrmSaveInput,
  ): Promise<void> {
    for (const [index, row] of input.rows.entries()) {
      await client.query(
        `INSERT INTO public.mrm_row_definitions (
           row_key, title, description, value_mode, display_order,
           highlighted, muted, emphasized, active_from_month, managed
         ) VALUES ($1, $2, $3, 'manual', $4, $5, $6, $7, DATE '2025-01-01', FALSE)
         ON CONFLICT (row_key) DO UPDATE SET
           display_order = EXCLUDED.display_order,
           title = CASE WHEN NOT public.mrm_row_definitions.managed THEN EXCLUDED.title ELSE public.mrm_row_definitions.title END,
           description = CASE WHEN NOT public.mrm_row_definitions.managed THEN EXCLUDED.description ELSE public.mrm_row_definitions.description END,
           highlighted = EXCLUDED.highlighted, muted = EXCLUDED.muted,
           emphasized = EXCLUDED.emphasized`,
        [row.key, row.title, row.description, index, row.highlighted, row.muted, row.emphasized],
      );
    }
    for (const [index, column] of input.columns.entries()) {
      await client.query(
        `INSERT INTO public.mrm_report_columns (
           report_id, column_key, definition_key, label, column_type, display_order, managed
         ) VALUES (
           $1::uuid, $2,
           CASE WHEN $5 THEN $2 ELSE NULL END,
           $3, $4, $6, $5
         )
         ON CONFLICT (report_id, column_key) DO UPDATE SET
           label = CASE WHEN NOT public.mrm_report_columns.managed THEN EXCLUDED.label ELSE public.mrm_report_columns.label END,
           column_type = CASE WHEN NOT public.mrm_report_columns.managed THEN EXCLUDED.column_type ELSE public.mrm_report_columns.column_type END,
           display_order = EXCLUDED.display_order`,
        [reportId, column.key, column.label, column.type, column.managed, index],
      );
    }
    const retainedColumns = input.columns.map((column) => column.key);
    await client.query(
      `DELETE FROM public.mrm_report_columns
       WHERE report_id = $1::uuid AND NOT managed
         AND NOT (column_key = ANY($2::text[]))`,
      [reportId, retainedColumns],
    );
    await client.query(
      `DELETE FROM public.mrm_cells cells
       USING public.mrm_row_definitions rows
       WHERE cells.report_id = $1::uuid AND cells.row_key = rows.row_key
         AND rows.value_mode = 'manual'`,
      [reportId],
    );
    const columnByKey = await client.query<{ id: string; column_key: string }>(
      `SELECT id::text, column_key FROM public.mrm_report_columns WHERE report_id = $1::uuid`,
      [reportId],
    );
    const columnIds = new Map(columnByKey.rows.map((column) => [column.column_key, column.id]));
    const rowModes = await client.query<{ row_key: string; value_mode: string }>(
      `SELECT row_key, value_mode FROM public.mrm_row_definitions
       WHERE row_key = ANY($1::text[])`,
      [input.rows.map((row) => row.key)],
    );
    const manualRows = new Set(rowModes.rows.filter((row) => row.value_mode === 'manual').map((row) => row.row_key));
    for (const row of input.rows) {
      if (!manualRows.has(row.key)) continue;
      for (const [columnKey, value] of Object.entries(row.cells)) {
        const columnId = columnIds.get(columnKey);
        if (!columnId || value === undefined || value === null || value === '') continue;
        await client.query(
          `INSERT INTO public.mrm_cells (
             report_id, row_key, report_column_id, value, value_source, updated_by
           ) VALUES ($1::uuid, $2, $3::uuid, $4::jsonb, 'manual', $5::uuid)`,
          [reportId, row.key, columnId, JSON.stringify(value), accountId],
        );
      }
    }
  }

  async finalize(
    reportId: string,
    accountId: string,
    expectedRevision: number,
    buckets: MrmMetricBucket[],
    payload: unknown,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('mrm-finalize:' || $1::text))`, [reportId]);
      const report = await client.query<{ status: string; revision: string }>(
        `SELECT status, revision::text FROM public.mrm_reports WHERE id = $1::uuid FOR UPDATE`,
        [reportId],
      );
      const current = report.rows[0];
      if (!current) throw new NotFoundException('MRM report not found.');
      if (current.status === 'finalized') return;
      if (Number(current.revision) !== expectedRevision) {
        throw new ConflictException('MRM report revision conflict.');
      }
      for (const bucket of buckets) {
        await client.query(
          `INSERT INTO public.mrm_metric_snapshots (
             report_id, metric_key, range_key, org_unit_key,
             numerator, denominator, quality_count
           ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`,
          [reportId, bucket.metricKey, bucket.rangeKey, bucket.orgUnitKey,
            bucket.numerator, bucket.denominator, bucket.qualityCount],
        );
      }
      const nextRevision = expectedRevision + 1;
      const finalizedPayload = {
        ...(payload as Record<string, unknown>),
        status: 'finalized',
        revision: nextRevision,
      };
      const payloadJson = JSON.stringify(finalizedPayload);
      const checksum = createHash('sha256').update(payloadJson).digest('hex');
      await client.query(
        `INSERT INTO public.mrm_report_snapshots (
           report_id, payload, checksum, created_by
         ) VALUES (
           $1::uuid, $2::jsonb, $3, $4::uuid
         )`,
        [reportId, payloadJson, checksum, accountId],
      );
      await client.query(
        `UPDATE public.mrm_reports SET status = 'finalized', revision = $3,
           finalized_by = $2::uuid, finalized_at = CURRENT_TIMESTAMP,
           updated_by = $2::uuid, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1::uuid`,
        [reportId, accountId, nextRevision],
      );
      await client.query(
        `INSERT INTO public.mrm_audit_events (report_id, actor_account_id, event_type, event_details)
         VALUES ($1::uuid, $2::uuid, 'report_finalized', JSONB_BUILD_OBJECT('revision', $3::bigint))`,
        [reportId, accountId, nextRevision],
      );
    });
  }

  async addAttachment(
    reportId: string,
    rowKey: string,
    columnKey: string,
    accountId: string,
    file: MrmUploadedFile,
    safeFilename: string,
    sha256: string,
  ): Promise<string> {
    const result = await this.database.query<{ id: string }>(
      `WITH inserted AS (
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
       ) SELECT id::text FROM inserted`,
      [reportId, rowKey, columnKey, file.originalname, safeFilename,
        file.mimetype, file.size, sha256, file.buffer, accountId],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new ConflictException('Attachment target is not an editable draft cell.');
    return id;
  }

  async getAttachment(reportId: string, attachmentId: string, accountId: string) {
    const result = await this.database.query<{
      filename: string;
      mime_type: string;
      size_bytes: number;
      content: Buffer;
    }>(
      `SELECT attachment.original_filename AS filename, attachment.mime_type,
              attachment.size_bytes, attachment.content
       FROM public.mrm_attachments attachment
       INNER JOIN public.mrm_reports report ON report.id = attachment.report_id
       WHERE report.id = $1::uuid AND attachment.id = $2::uuid
         AND EXISTS (
           SELECT 1 FROM public.master_access access WHERE access.account_id = $3::uuid
         )`,
      [reportId, attachmentId, accountId],
    );
    return result.rows[0] ?? null;
  }

  async deleteAttachment(reportId: string, attachmentId: string, accountId: string): Promise<void> {
    const result = await this.database.query(
      `WITH deleted AS (
         DELETE FROM public.mrm_attachments attachment
         USING public.mrm_reports report
         WHERE attachment.id = $2::uuid AND attachment.report_id = $1::uuid
           AND report.id = attachment.report_id AND report.status = 'draft'
         RETURNING attachment.id
       )
       INSERT INTO public.mrm_audit_events (report_id, actor_account_id, event_type, event_details)
       SELECT $1::uuid, $3::uuid, 'attachment_deleted',
              JSONB_BUILD_OBJECT('attachmentId', id) FROM deleted`,
      [reportId, attachmentId, accountId],
    );
    if (!result.rowCount) throw new NotFoundException('Draft attachment not found.');
  }
}