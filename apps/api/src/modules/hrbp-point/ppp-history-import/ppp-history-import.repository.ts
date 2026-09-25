import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';
import type {
  ParsedPppImportRow,
  PppPreviewFilter,
  PppPreviewPage,
  PppPreviewSummary,
  UploadedPppFile,
} from './ppp-history-import.types';

type PreviewRecord = {
  preview_id: string;
  file_name: string;
  file_hash: string;
  current_year: number;
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  invalid_rows: number;
};

type StoredRow = {
  row_number: number;
  row_data: ParsedPppImportRow['values'];
  issues: ParsedPppImportRow['issues'];
};

@Injectable()
export class PppHistoryImportRepository {
  constructor(private readonly database: DatabaseService) {}

  async getKnownPersNos(persNos: string[]): Promise<Set<string>> {
    if (!persNos.length) return new Set();
    const result = await this.database.query<{ pers_no: string }>(
      `SELECT pers_no::text AS pers_no FROM public.employee_namelist WHERE pers_no = ANY($1::bigint[])`,
      [persNos],
    );
    return new Set(result.rows.map((row) => row.pers_no));
  }

  async createPreview(actorAccountId: string, file: UploadedPppFile, currentYear: number, rows: ParsedPppImportRow[]): Promise<string> {
    return this.database.transaction(async (client) => {
      await client.query(`DELETE FROM public.employee_ppp_history_import_previews WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP`);
      const counts = this.countRows(rows);
      const preview = await client.query<{ preview_id: string }>(
        `INSERT INTO public.employee_ppp_history_import_previews (
           uploaded_by, file_name, file_hash, current_year, total_rows,
           valid_rows, warning_rows, invalid_rows
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING preview_id`,
        [actorAccountId, file.originalname, createHash('sha256').update(file.buffer).digest('hex'), currentYear, rows.length, counts.valid, counts.warning, counts.invalid],
      );
      const previewId = preview.rows[0].preview_id;
      for (let offset = 0; offset < rows.length; offset += 500) {
        const batch = rows.slice(offset, offset + 500).map((row) => ({
          row_number: row.rowNumber,
          row_data: row.values,
          issues: row.issues,
          is_valid: !row.issues.some((issue) => issue.severity === 'error'),
          has_warning: row.issues.some((issue) => issue.severity === 'warning'),
        }));
        await client.query(
          `INSERT INTO public.employee_ppp_history_import_preview_rows
             (preview_id, row_number, row_data, issues, is_valid, has_warning)
           SELECT $1, item.row_number, item.row_data, item.issues, item.is_valid, item.has_warning
           FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             row_number integer, row_data jsonb, issues jsonb, is_valid boolean, has_warning boolean
           )`,
          [previewId, JSON.stringify(batch)],
        );
      }
      return previewId;
    });
  }

  async getSummary(previewId: string, actorAccountId: string): Promise<PppPreviewSummary | null> {
    const result = await this.database.query<PreviewRecord>(
      `SELECT preview_id, file_name, file_hash, current_year, total_rows, valid_rows, warning_rows, invalid_rows
       FROM public.employee_ppp_history_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP`,
      [previewId, actorAccountId],
    );
    if (!result.rows[0]) return null;
    return this.buildSummary(result.rows[0], await this.hasExistingHistory());
  }

  async getRows(previewId: string, actorAccountId: string, filter: PppPreviewFilter, page: number, pageSize: number): Promise<PppPreviewPage | null> {
    const summary = await this.getSummary(previewId, actorAccountId);
    if (!summary) return null;
    const condition = `($2::text = 'all'
      OR ($2 = 'valid' AND is_valid AND NOT has_warning)
      OR ($2 = 'warning' AND is_valid AND has_warning)
      OR ($2 = 'invalid' AND NOT is_valid))`;
    const [rows, count] = await Promise.all([
      this.database.query<StoredRow>(
        `SELECT row_number, row_data, issues FROM public.employee_ppp_history_import_preview_rows
         WHERE preview_id = $1 AND ${condition} ORDER BY row_number LIMIT $3 OFFSET $4`,
        [previewId, filter, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM public.employee_ppp_history_import_preview_rows
         WHERE preview_id = $1 AND ${condition}`,
        [previewId, filter],
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

  async getAllRows(previewId: string, actorAccountId: string): Promise<ParsedPppImportRow[] | null> {
    if (!(await this.getSummary(previewId, actorAccountId))) return null;
    const result = await this.database.query<StoredRow>(
      `SELECT row_number, row_data, issues FROM public.employee_ppp_history_import_preview_rows
       WHERE preview_id = $1 ORDER BY row_number`,
      [previewId],
    );
    return result.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data, issues: row.issues }));
  }

  async replaceRows(previewId: string, actorAccountId: string, rows: ParsedPppImportRow[]): Promise<void> {
    const payload = rows.map((row) => ({
      row_number: row.rowNumber,
      row_data: row.values,
      issues: row.issues,
      is_valid: !row.issues.some((issue) => issue.severity === 'error'),
      has_warning: row.issues.some((issue) => issue.severity === 'warning'),
    }));
    const counts = this.countRows(rows);
    await this.database.transaction(async (client) => {
      const preview = await client.query(
        `SELECT 1 FROM public.employee_ppp_history_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [previewId, actorAccountId],
      );
      if (!preview.rowCount) throw new Error('PREVIEW_NOT_FOUND');
      await client.query(
        `UPDATE public.employee_ppp_history_import_preview_rows target
         SET row_data = source.row_data, issues = source.issues,
             is_valid = source.is_valid, has_warning = source.has_warning
         FROM JSONB_TO_RECORDSET($2::jsonb) AS source(
           row_number integer, row_data jsonb, issues jsonb, is_valid boolean, has_warning boolean
         )
         WHERE target.preview_id = $1 AND target.row_number = source.row_number`,
        [previewId, JSON.stringify(payload)],
      );
      await client.query(
        `UPDATE public.employee_ppp_history_import_previews
         SET valid_rows = $2, warning_rows = $3, invalid_rows = $4 WHERE preview_id = $1`,
        [previewId, counts.valid, counts.warning, counts.invalid],
      );
    });
  }

  async cancel(previewId: string, actorAccountId: string): Promise<boolean> {
    const result = await this.database.query(
      `DELETE FROM public.employee_ppp_history_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'`,
      [previewId, actorAccountId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async commit(previewId: string, actorAccountId: string, confirmReplacement: boolean, serverYear: number): Promise<{ employees: number; yearlyRows: number; skippedRows: number }> {
    return this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('employee_namelist_import'))`);
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('employee_ppp_history_import'))`);
      const preview = await client.query<PreviewRecord>(
        `SELECT preview_id, file_name, file_hash, current_year, total_rows, valid_rows, warning_rows, invalid_rows
         FROM public.employee_ppp_history_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [previewId, actorAccountId],
      );
      const record = preview.rows[0];
      if (!record) throw new Error('PREVIEW_NOT_FOUND');
      if (record.invalid_rows > 0) throw new Error('INVALID_ROWS');
      if (record.current_year !== serverYear) throw new Error('STALE_YEAR');
      if ((await this.hasExistingHistory(client)) && !confirmReplacement) throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');

      const importable = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM public.employee_ppp_history_import_preview_rows preview_row
         JOIN public.employee_namelist employee
           ON employee.pers_no = (preview_row.row_data->>'pers_no')::bigint
         WHERE preview_row.preview_id = $1 AND preview_row.is_valid`,
        [previewId],
      );
      const employees = Number(importable.rows[0]?.count ?? 0);
      if (!employees) throw new Error('NO_IMPORTABLE_ROWS');
      const skippedRows = record.total_rows - employees;
      const audit = await client.query<{ id: string }>(
        `INSERT INTO public.employee_ppp_history_imports (
           imported_by, file_name, file_hash, current_year, source_rows,
           imported_employees, skipped_rows, yearly_rows, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processing') RETURNING id::text`,
        [actorAccountId, record.file_name, record.file_hash, record.current_year, record.total_rows, employees, skippedRows, employees * 3],
      );

      await client.query(`DELETE FROM public.employee_ppp_history`);
      await client.query(
        `WITH source AS (
           SELECT employee.pers_no, preview_row.row_data
           FROM public.employee_ppp_history_import_preview_rows preview_row
           JOIN public.employee_namelist employee
             ON employee.pers_no = (preview_row.row_data->>'pers_no')::bigint
           WHERE preview_row.preview_id = $1 AND preview_row.is_valid
         )
         INSERT INTO public.employee_ppp_history
           (pers_no, calendar_year, performance, position, person, tcl, import_id)
         SELECT source.pers_no, yearly.calendar_year,
                NULLIF(BTRIM(yearly.performance), ''), NULLIF(BTRIM(yearly.position), ''),
                NULLIF(BTRIM(yearly.person), ''), NULLIF(BTRIM(yearly.tcl), ''), $3
         FROM source
         CROSS JOIN LATERAL (VALUES
           ($2::integer, source.row_data->>'performance_current', source.row_data->>'position_current', source.row_data->>'person_current', source.row_data->>'tcl_current'),
           ($2::integer - 1, source.row_data->>'performance_previous', source.row_data->>'position_previous', source.row_data->>'person_previous', source.row_data->>'tcl_previous'),
           ($2::integer - 2, source.row_data->>'performance_oldest', source.row_data->>'position_oldest', source.row_data->>'person_oldest', source.row_data->>'tcl_oldest')
         ) AS yearly(calendar_year, performance, position, person, tcl)`,
        [previewId, record.current_year, audit.rows[0].id],
      );
      await client.query(
        `UPDATE public.employee_ppp_history_imports
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [audit.rows[0].id],
      );
      await client.query(
        `UPDATE public.employee_ppp_history_import_previews SET status = 'committed' WHERE preview_id = $1`,
        [previewId],
      );
      return { employees, yearlyRows: employees * 3, skippedRows };
    });
  }

  private countRows(rows: ParsedPppImportRow[]) {
    return rows.reduce((counts, row) => {
      if (row.issues.some((issue) => issue.severity === 'error')) counts.invalid += 1;
      else if (row.issues.some((issue) => issue.severity === 'warning')) counts.warning += 1;
      else counts.valid += 1;
      return counts;
    }, { valid: 0, warning: 0, invalid: 0 });
  }

  private buildSummary(record: PreviewRecord, hasExistingHistory: boolean): PppPreviewSummary {
    return {
      id: record.preview_id,
      fileName: record.file_name,
      currentYear: record.current_year,
      totalRows: record.total_rows,
      validRows: record.valid_rows,
      warningRows: record.warning_rows,
      invalidRows: record.invalid_rows,
      hasExistingHistory,
    };
  }

  private async hasExistingHistory(client: Pick<DatabaseService, 'query'> = this.database): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM public.employee_ppp_history) AS exists`,
    );
    return result.rows[0]?.exists ?? false;
  }
}
