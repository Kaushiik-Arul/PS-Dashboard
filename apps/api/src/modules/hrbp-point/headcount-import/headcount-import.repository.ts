import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';
import type {
  HeadcountCommitResult,
  HeadcountMonthPreview,
  HeadcountPreview,
  ParsedHeadcountWorkbook,
  UploadedHeadcountFile,
} from './headcount-import.types';

type PreviewPayload = Omit<HeadcountPreview, 'id' | 'fileName' | 'expiresAt'>;

type PreviewRecord = {
  preview_id: string;
  file_name: string;
  preview_payload: PreviewPayload;
  has_errors: boolean;
  existing_months: number;
  expires_at: Date | string;
};

@Injectable()
export class HeadcountImportRepository {
  constructor(private readonly database: DatabaseService) {}

  async createPreview(
    actorAccountId: string,
    file: UploadedHeadcountFile,
    parsed: ParsedHeadcountWorkbook,
  ): Promise<HeadcountPreview> {
    return this.database.transaction(async (client) => {
      await client.query(
        `DELETE FROM public.employee_headcount_import_previews
         WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP`,
      );
      const reportingMonths = parsed.months.map((month) => month.reportingMonth);
      const existing = reportingMonths.length
        ? await client.query<{ reporting_month: string; total_headcount: number }>(
          `SELECT reporting_month::text AS reporting_month, total_headcount
           FROM public.employee_headcount_months
           WHERE reporting_month = ANY($1::date[])`,
          [reportingMonths],
        )
        : { rows: [] };
      const existingByMonth = new Map(
        existing.rows.map((row) => [row.reporting_month, row.total_headcount]),
      );
      const months: HeadcountMonthPreview[] = parsed.months.map((month) => ({
        ...month,
        existingTotalHeadcount: existingByMonth.get(month.reportingMonth) ?? null,
      }));
      const payload: PreviewPayload = {
        includedSheets: parsed.includedSheets,
        ignoredSheets: parsed.ignoredSheets,
        months,
        issues: parsed.issues,
      };
      const result = await client.query<PreviewRecord>(
        `INSERT INTO public.employee_headcount_import_previews (
           uploaded_by, file_name, file_hash, preview_payload, has_errors, existing_months
         ) VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         RETURNING preview_id, file_name, preview_payload, has_errors, existing_months, expires_at`,
        [
          actorAccountId,
          file.originalname,
          createHash('sha256').update(file.buffer).digest('hex'),
          JSON.stringify(payload),
          parsed.issues.length > 0 || parsed.months.length !== parsed.includedSheets.length,
          existingByMonth.size,
        ],
      );
      return this.buildPreview(result.rows[0]);
    });
  }

  async getPreview(previewId: string, actorAccountId: string): Promise<HeadcountPreview | null> {
    const result = await this.database.query<PreviewRecord>(
      `SELECT preview_id, file_name, preview_payload, has_errors, existing_months, expires_at
       FROM public.employee_headcount_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP`,
      [previewId, actorAccountId],
    );
    return result.rows[0] ? this.buildPreview(result.rows[0]) : null;
  }

  async cancel(previewId: string, actorAccountId: string): Promise<boolean> {
    const result = await this.database.query(
      `DELETE FROM public.employee_headcount_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'`,
      [previewId, actorAccountId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async commit(
    previewId: string,
    actorAccountId: string,
    confirmReplacement: boolean,
  ): Promise<HeadcountCommitResult> {
    return this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('employee_headcount_import'))`);
      const preview = await client.query<PreviewRecord & { file_hash: string }>(
        `SELECT preview_id, file_name, file_hash, preview_payload, has_errors,
                existing_months, expires_at
         FROM public.employee_headcount_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP
         FOR UPDATE`,
        [previewId, actorAccountId],
      );
      const record = preview.rows[0];
      if (!record) throw new Error('PREVIEW_NOT_FOUND');
      if (record.has_errors || record.preview_payload.issues.length > 0 || !record.preview_payload.months.length) {
        throw new Error('INVALID_WORKBOOK');
      }

      const reportingMonths = record.preview_payload.months.map((month) => month.reportingMonth);
      const existing = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM public.employee_headcount_months
         WHERE reporting_month = ANY($1::date[])`,
        [reportingMonths],
      );
      const replacedMonths = Number(existing.rows[0]?.count ?? 0);
      if (replacedMonths > 0 && !confirmReplacement) {
        throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');
      }

      const audit = await client.query<{ id: string }>(
        `INSERT INTO public.employee_headcount_imports (
           imported_by, file_name, file_hash, included_sheets, ignored_sheets,
           imported_months, replaced_months, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')
         RETURNING id::text`,
        [
          actorAccountId,
          record.file_name,
          record.file_hash,
          record.preview_payload.includedSheets.length,
          record.preview_payload.ignoredSheets.length,
          record.preview_payload.months.length,
          replacedMonths,
        ],
      );
      const importId = audit.rows[0].id;

      await client.query(
        `DELETE FROM public.employee_headcount_months
         WHERE reporting_month = ANY($1::date[])`,
        [reportingMonths],
      );
      await client.query(
        `INSERT INTO public.employee_headcount_months
           (reporting_month, total_headcount, source_import_id)
         SELECT item.reporting_month::date, item.total_headcount, $2::bigint
         FROM JSONB_TO_RECORDSET($1::jsonb) AS item(
           reporting_month text, total_headcount integer
         )`,
        [
          JSON.stringify(record.preview_payload.months.map((month) => ({
            reporting_month: month.reportingMonth,
            total_headcount: month.totalHeadcount,
          }))),
          importId,
        ],
      );

      const ranges = record.preview_payload.months.flatMap((month) =>
        month.ranges.map((range) => ({
          reporting_month: month.reportingMonth,
          range_key: range.rangeKey,
          range_name: range.rangeName,
          headcount: range.headcount,
        })),
      );
      if (ranges.length) {
        await client.query(
          `INSERT INTO public.employee_headcount_by_range
             (reporting_month, range_key, range_name, headcount)
           SELECT item.reporting_month::date, item.range_key, item.range_name, item.headcount
           FROM JSONB_TO_RECORDSET($1::jsonb) AS item(
             reporting_month text, range_key text, range_name text, headcount integer
           )`,
          [JSON.stringify(ranges)],
        );
      }

      await client.query(
        `UPDATE public.employee_headcount_imports
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [importId],
      );
      await client.query(
        `UPDATE public.employee_headcount_import_previews
         SET status = 'committed' WHERE preview_id = $1`,
        [previewId],
      );
      return { importedMonths: record.preview_payload.months.length, replacedMonths };
    });
  }

  private buildPreview(record: PreviewRecord): HeadcountPreview {
    return {
      id: record.preview_id,
      fileName: record.file_name,
      ...record.preview_payload,
      expiresAt: new Date(record.expires_at).toISOString(),
    };
  }

}