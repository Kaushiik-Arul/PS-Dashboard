import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../../database/database.service';
import type { StepFile, StepIssue, StepRow, StepValues } from './active-step.types';

type Preview = { preview_id: string; file_name: string; total_rows: number; valid_rows: number; invalid_rows: number; status: string; file_hash: string; created_at: Date };

@Injectable()
export class ActiveStepRepository {
  constructor(private readonly database: DatabaseService) {}

  async createPreview(file: StepFile, rows: StepRow[], actor: string) {
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    return this.database.transaction(async (client) => {
      const valid = rows.filter((row) => !row.issues.length).length;
      const result = await client.query<{ preview_id: string }>(
        `INSERT INTO public.active_step_previews (uploaded_by, file_name, file_hash, total_rows, valid_rows, invalid_rows)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING preview_id`,
        [actor, file.originalname, hash, rows.length, valid, rows.length - valid],
      );
      const id = result.rows[0].preview_id;
      for (let start = 0; start < rows.length; start += 500) {
        const batch = rows.slice(start, start + 500).map((row) => ({ row_number: row.rowNumber, row_data: row.values, issues: row.issues, is_valid: !row.issues.length }));
        await client.query(
          `INSERT INTO public.active_step_preview_rows (preview_id, row_number, row_data, issues, is_valid)
           SELECT $1, item.row_number, item.row_data, item.issues, item.is_valid
           FROM JSONB_TO_RECORDSET($2::JSONB) AS item(row_number INTEGER, row_data JSONB, issues JSONB, is_valid BOOLEAN)`,
          [id, JSON.stringify(batch)],
        );
      }
      return { id };
    });
  }

  async getPreview(id: string, actor: string, filter: string, page: number) {
    const found = await this.database.query<Preview>(
      `SELECT preview_id, file_name, total_rows, valid_rows, invalid_rows, status, file_hash FROM public.active_step_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP`, [id, actor],
    );
    const preview = found.rows[0];
    if (!preview) throw new Error('PREVIEW_NOT_FOUND');
    const condition = filter === 'valid' ? 'AND is_valid' : filter === 'invalid' ? 'AND NOT is_valid' : '';
    const [rows, count, existing] = await Promise.all([
      this.database.query<{ row_number: number; row_data: StepRow['values']; issues: StepRow['issues'] }>(
        `SELECT row_number, row_data, issues FROM public.active_step_preview_rows WHERE preview_id = $1 ${condition} ORDER BY row_number LIMIT 25 OFFSET $2`, [id, (page - 1) * 25]),
      this.database.query<{ count: string }>(`SELECT COUNT(*)::TEXT AS count FROM public.active_step_preview_rows WHERE preview_id = $1 ${condition}`, [id]),
      this.database.query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM public.active_step_rows'),
    ]);
    return {
      id, fileName: preview.file_name, totalRows: preview.total_rows, validRows: preview.valid_rows,
      invalidRows: preview.invalid_rows, existingRows: Number(existing.rows[0].count), filteredRows: Number(count.rows[0].count),
      page, rows: rows.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data, issues: row.issues })),
    };
  }

  async updateRow(id: string, actor: string, rowNumber: number, values: StepValues, issues: StepIssue[]) {
    await this.database.transaction(async (client) => {
      const preview = await client.query(
        `SELECT 1 FROM public.active_step_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [id, actor],
      );
      if (!preview.rowCount) throw new Error('PREVIEW_NOT_FOUND');
      const updated = await client.query(
        `UPDATE public.active_step_preview_rows SET row_data = $3::JSONB, issues = $4::JSONB, is_valid = $5
         WHERE preview_id = $1 AND row_number = $2`,
        [id, rowNumber, JSON.stringify(values), JSON.stringify(issues), !issues.length],
      );
      if (!updated.rowCount) throw new Error('ROW_NOT_FOUND');
      await this.refreshCounts(client, id);
    });
  }

  async deleteRow(id: string, actor: string, rowNumber: number) {
    await this.database.transaction(async (client) => {
      const preview = await client.query<{ total_rows: number }>(
        `SELECT total_rows FROM public.active_step_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [id, actor],
      );
      if (!preview.rows.length) throw new Error('PREVIEW_NOT_FOUND');
      if (preview.rows[0].total_rows <= 1) throw new Error('LAST_PREVIEW_ROW');
      const deleted = await client.query(
        'DELETE FROM public.active_step_preview_rows WHERE preview_id = $1 AND row_number = $2', [id, rowNumber],
      );
      if (!deleted.rowCount) throw new Error('ROW_NOT_FOUND');
      await this.refreshCounts(client, id);
    });
  }

  private async refreshCounts(client: PoolClient, id: string) {
    await client.query(
      `UPDATE public.active_step_previews p SET total_rows = counts.total,
         valid_rows = counts.valid, invalid_rows = counts.total - counts.valid
       FROM (SELECT COUNT(*)::INTEGER AS total, COUNT(*) FILTER (WHERE is_valid)::INTEGER AS valid
             FROM public.active_step_preview_rows WHERE preview_id = $1) counts
       WHERE p.preview_id = $1`, [id],
    );
  }

  async cancel(id: string, actor: string): Promise<boolean> {
    const result = await this.database.query(
      `DELETE FROM public.active_step_previews WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'`, [id, actor],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async commit(id: string, actor: string, confirmed: boolean) {
    return this.database.transaction(async (client) => {
      await client.query("SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('active_step_replace'))");
      const found = await client.query<Preview>(
        `SELECT preview_id, file_name, file_hash, total_rows, valid_rows, invalid_rows, status, created_at FROM public.active_step_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [id, actor],
      );
      const preview = found.rows[0];
      if (!preview) throw new Error('PREVIEW_NOT_FOUND');
      if (!confirmed) throw new Error('CONFIRM_REQUIRED');
      const newer = await client.query<{ exists: boolean }>(
        'SELECT EXISTS (SELECT 1 FROM public.active_step_imports WHERE imported_at > $1) AS exists', [preview.created_at],
      );
      if (newer.rows[0].exists) throw new Error('STALE_PREVIEW');
      if (preview.invalid_rows || !preview.valid_rows || preview.valid_rows !== preview.total_rows) throw new Error('INVALID_ROWS');
      const existing = await client.query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM public.active_step_rows');
      const replacedRows = +existing.rows[0].count;
      const inserted = await client.query<{ import_id: string }>(
        `INSERT INTO public.active_step_imports (file_name, file_hash, row_count, replaced_rows, imported_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING import_id`,
        [preview.file_name, preview.file_hash, preview.total_rows, replacedRows, actor],
      );
      const importId = inserted.rows[0].import_id;
      await client.query('DELETE FROM public.active_step_rows');
      const result = await client.query(
        `INSERT INTO public.active_step_rows (
           import_id, source_row_number, sl_no, year, pers_no, e_name, grp, initiated_by, exchanged_with,
           step_from, step_to, entity_from, entity_to, gb_from, gb_to, function_from, function_to,
           dept_from, dept_to, location_from, location_to
         ) SELECT $2, r.row_number, NULLIF(v.sl_no, ''), v.year::INTEGER, v.pers_no::BIGINT, NULLIF(v.e_name, ''),
           NULLIF(v.grp, ''), NULLIF(v.initiated_by, ''), NULLIF(v.exchanged_with, ''),
           v.step_from::DATE, NULLIF(v.step_to, '')::DATE,
           NULLIF(v.entity_from, ''), NULLIF(v.entity_to, ''), NULLIF(v.gb_from, ''), NULLIF(v.gb_to, ''),
           NULLIF(v.function_from, ''), NULLIF(v.function_to, ''), NULLIF(v.dept_from, ''), NULLIF(v.dept_to, ''),
           NULLIF(v.location_from, ''), NULLIF(v.location_to, '')
         FROM public.active_step_preview_rows r
         CROSS JOIN LATERAL JSONB_TO_RECORD(r.row_data) AS v(
           sl_no TEXT, year TEXT, pers_no TEXT, e_name TEXT, grp TEXT, initiated_by TEXT, exchanged_with TEXT,
           step_from TEXT, step_to TEXT, entity_from TEXT, entity_to TEXT, gb_from TEXT, gb_to TEXT,
           function_from TEXT, function_to TEXT, dept_from TEXT, dept_to TEXT, location_from TEXT, location_to TEXT)
         WHERE r.preview_id = $1 AND r.is_valid ORDER BY r.row_number`, [id, importId],
      );
      if (result.rowCount !== preview.total_rows) throw new Error('INVALID_ROWS');
      await client.query("UPDATE public.active_step_previews SET status = 'committed' WHERE preview_id = $1", [id]);
      return { importedRows: result.rowCount, replacedRows };
    });
  }

  async list(actor: string) {
    const result = await this.database.query<Record<string, string | number | null>>(
      `SELECT s.id::TEXT AS id, s.sl_no AS "slNo", s.year, s.pers_no::TEXT AS "persNo",
         COALESCE(NULLIF(e.personnel_number, ''), NULLIF(s.e_name, ''), s.pers_no::TEXT) AS "employeeName", s.grp,
         s.initiated_by AS "initiatedBy", s.exchanged_with AS "exchangedWith",
         TO_CHAR(s.step_from, 'YYYY-MM-DD') AS "stepFrom", TO_CHAR(s.step_to, 'YYYY-MM-DD') AS "stepTo",
         s.entity_from AS "entityFrom", s.entity_to AS "entityTo", s.gb_from AS "gbFrom", s.gb_to AS "gbTo",
         s.function_from AS "functionFrom", s.function_to AS "functionTo", s.dept_from AS "deptFrom", s.dept_to AS "deptTo",
         s.location_from AS "locationFrom", s.location_to AS "locationTo"
       FROM public.active_step_rows s LEFT JOIN public.employee_namelist e ON e.pers_no = s.pers_no
       WHERE EXISTS (
         SELECT 1 FROM public.master_access access WHERE access.account_id = $1::UUID
           AND (access.role IN ('hrbp', 'admin')
             OR (access.role = 'range_head' AND BTRIM(e.range) = BTRIM(access.assigned_range))
             OR (access.role IN ('department_head', 'sub_department_head')
               AND BTRIM(e.range) = BTRIM(access.assigned_range)
               AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit)))
       )
       ORDER BY s.source_row_number LIMIT 25000`, [actor],
    );
    return result.rows;
  }
}
