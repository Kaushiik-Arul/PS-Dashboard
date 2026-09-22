import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';
import type {
  NamelistPreviewPage,
  NamelistPreviewSummary,
  ParsedNamelistRow,
  PreviewFilter,
  UploadedNamelistFile,
} from './namelist-import.types';

type PreviewRecord = {
  preview_id: string;
  file_name: string;
  reporting_month: Date | string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
};

type StoredRow = {
  row_number: number;
  row_data: ParsedNamelistRow['values'];
  issues: ParsedNamelistRow['issues'];
};

function mapMonth(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 7) : value.slice(0, 7);
}

@Injectable()
export class NamelistImportRepository {
  constructor(private readonly database: DatabaseService) {}

  async createPreview(actorAccountId: string, file: UploadedNamelistFile, rows: ParsedNamelistRow[]): Promise<string> {
    return this.database.transaction(async (client) => {
      await client.query(`DELETE FROM public.namelist_import_previews WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP`);
      const validRows = rows.filter((row) => row.issues.length === 0).length;
      const preview = await client.query<{ preview_id: string }>(
        `INSERT INTO public.namelist_import_previews (
           uploaded_by, reporting_month, file_name, file_hash,
           total_rows, valid_rows, invalid_rows
         ) VALUES ($1, DATE_TRUNC('month', CURRENT_DATE)::date, $2, $3, $4, $5, $6)
         RETURNING preview_id`,
        [actorAccountId, file.originalname, createHash('sha256').update(file.buffer).digest('hex'), rows.length, validRows, rows.length - validRows],
      );
      const previewId = preview.rows[0].preview_id;
      for (let offset = 0; offset < rows.length; offset += 500) {
        const batch = rows.slice(offset, offset + 500).map((row) => ({
          row_number: row.rowNumber,
          row_data: row.values,
          issues: row.issues,
          is_valid: row.issues.length === 0,
        }));
        await client.query(
          `INSERT INTO public.namelist_import_preview_rows (preview_id, row_number, row_data, issues, is_valid)
           SELECT $1, item.row_number, item.row_data, item.issues, item.is_valid
           FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             row_number integer, row_data jsonb, issues jsonb, is_valid boolean
           )`,
          [previewId, JSON.stringify(batch)],
        );
      }
      return previewId;
    });
  }

  async getSummary(previewId: string, actorAccountId: string): Promise<NamelistPreviewSummary | null> {
    const preview = await this.database.query<PreviewRecord>(
      `SELECT preview_id, file_name, reporting_month, total_rows, valid_rows, invalid_rows
       FROM public.namelist_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP`,
      [previewId, actorAccountId],
    );
    if (!preview.rows[0]) return null;
    return this.buildSummary(preview.rows[0], await this.hasCurrentMonthImport(preview.rows[0].reporting_month));
  }

  async getRows(
    previewId: string,
    actorAccountId: string,
    filter: PreviewFilter,
    page: number,
    pageSize: number,
  ): Promise<NamelistPreviewPage | null> {
    const summary = await this.getSummary(previewId, actorAccountId);
    if (!summary) return null;
    const validity = filter === 'all' ? null : filter === 'valid';
    const [rows, count] = await Promise.all([
      this.database.query<StoredRow>(
        `SELECT row_number, row_data, issues
         FROM public.namelist_import_preview_rows
         WHERE preview_id = $1 AND ($2::boolean IS NULL OR is_valid = $2)
         ORDER BY row_number LIMIT $3 OFFSET $4`,
        [previewId, validity, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM public.namelist_import_preview_rows
         WHERE preview_id = $1 AND ($2::boolean IS NULL OR is_valid = $2)`,
        [previewId, validity],
      ),
    ]);
    return {
      ...summary,
      rows: rows.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data, issues: row.issues })),
      page,
      pageSize,
      filteredRows: Number(count.rows[0]?.count ?? 0),
    };
  }

  async getAllRows(previewId: string, actorAccountId: string): Promise<ParsedNamelistRow[] | null> {
    if (!(await this.getSummary(previewId, actorAccountId))) return null;
    const result = await this.database.query<StoredRow>(
      `SELECT row_number, row_data, issues FROM public.namelist_import_preview_rows
       WHERE preview_id = $1 ORDER BY row_number`,
      [previewId],
    );
    return result.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data, issues: row.issues }));
  }

  async replaceRows(previewId: string, actorAccountId: string, rows: ParsedNamelistRow[]): Promise<void> {
    const payload = rows.map((row) => ({ row_number: row.rowNumber, row_data: row.values, issues: row.issues, is_valid: row.issues.length === 0 }));
    const validRows = rows.filter((row) => row.issues.length === 0).length;
    await this.database.transaction(async (client) => {
      const preview = await client.query(
        `SELECT 1 FROM public.namelist_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP
         FOR UPDATE`,
        [previewId, actorAccountId],
      );
      if (!preview.rowCount) throw new Error('PREVIEW_NOT_FOUND');
      await client.query(
        `UPDATE public.namelist_import_preview_rows target
         SET row_data = source.row_data, issues = source.issues, is_valid = source.is_valid
         FROM JSONB_TO_RECORDSET($2::jsonb) AS source(row_number integer, row_data jsonb, issues jsonb, is_valid boolean)
         WHERE target.preview_id = $1 AND target.row_number = source.row_number`,
        [previewId, JSON.stringify(payload)],
      );
      await client.query(
        `UPDATE public.namelist_import_previews SET valid_rows = $2, invalid_rows = total_rows - $2
         WHERE preview_id = $1`,
        [previewId, validRows],
      );
    });
  }

  async cancel(previewId: string, actorAccountId: string): Promise<boolean> {
    const result = await this.database.query(
      `DELETE FROM public.namelist_import_previews WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'`,
      [previewId, actorAccountId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async commit(previewId: string, actorAccountId: string, confirmReplacement: boolean): Promise<number> {
    return this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('employee_namelist_import'))`);
      const preview = await client.query<PreviewRecord>(
        `SELECT preview_id, file_name, reporting_month, total_rows, valid_rows, invalid_rows
         FROM public.namelist_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [previewId, actorAccountId],
      );
      const record = preview.rows[0];
      if (!record) throw new Error('PREVIEW_NOT_FOUND');
      if (record.invalid_rows > 0) throw new Error('INVALID_ROWS');
      if ((await this.hasCurrentMonthImport(record.reporting_month, client)) && !confirmReplacement) throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');

      const audit = await client.query<{ id: string }>(
        `INSERT INTO public.namelist_imports (reporting_month, imported_by, file_name, total_rows, status)
         VALUES ($1, $2, $3, $4, 'processing') RETURNING id::text`,
        [record.reporting_month, actorAccountId, record.file_name, record.total_rows],
      );
      await client.query('DELETE FROM public.employee_namelist');
      await client.query(
        `INSERT INTO public.employee_namelist (
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
         FROM public.namelist_import_preview_rows WHERE preview_id = $1 ORDER BY row_number`,
        [previewId],
      );
      await client.query(`UPDATE public.namelist_imports SET status = 'completed' WHERE id = $1`, [audit.rows[0].id]);
      await client.query(`UPDATE public.namelist_import_previews SET status = 'committed' WHERE preview_id = $1`, [previewId]);
      return record.total_rows;
    });
  }

  private buildSummary(record: PreviewRecord, hasCurrentMonthImport: boolean): NamelistPreviewSummary {
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

  private async hasCurrentMonthImport(reportingMonth: Date | string, client: Pick<DatabaseService, 'query'> = this.database): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM public.namelist_imports WHERE reporting_month = $1 AND status = 'completed') AS exists`,
      [reportingMonth],
    );
    return result.rows[0]?.exists ?? false;
  }

}