import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../../database/database.service';
import type {
  OrgStructureFile,
  OrgStructurePreviewRow,
  OrgStructureValues,
} from './org-structure-import.types';

type Preview = {
  preview_id: string;
  file_name: string;
  file_hash: string;
  total_rows: number;
  status: string;
  created_at: Date;
};

@Injectable()
export class OrgStructureImportRepository {
  constructor(private readonly database: DatabaseService) {}

  async createPreview(file: OrgStructureFile, rows: OrgStructurePreviewRow[], actor: string) {
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    return this.database.transaction(async (client) => {
      const result = await client.query<{ preview_id: string }>(
        `INSERT INTO public.org_structure_previews (uploaded_by, file_name, file_hash, total_rows)
         VALUES ($1, $2, $3, $4) RETURNING preview_id`,
        [actor, file.originalname, hash, rows.length],
      );
      const id = result.rows[0].preview_id;
      for (let start = 0; start < rows.length; start += 500) {
        const batch = rows.slice(start, start + 500).map((row) => ({ row_number: row.rowNumber, row_data: row.values }));
        await client.query(
          `INSERT INTO public.org_structure_preview_rows (preview_id, row_number, row_data)
           SELECT $1, item.row_number, item.row_data
           FROM JSONB_TO_RECORDSET($2::JSONB) AS item(row_number INTEGER, row_data JSONB)`,
          [id, JSON.stringify(batch)],
        );
      }
      return { id };
    });
  }

  async getPreview(id: string, actor: string, page: number) {
    const found = await this.database.query<Preview>(
      `SELECT preview_id, file_name, file_hash, total_rows, status, created_at
       FROM public.org_structure_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP`,
      [id, actor],
    );
    const preview = found.rows[0];
    if (!preview) throw new Error('PREVIEW_NOT_FOUND');
    const [rows, existing] = await Promise.all([
      this.database.query<{ row_number: number; row_data: OrgStructureValues }>(
        `SELECT row_number, row_data FROM public.org_structure_preview_rows
         WHERE preview_id = $1 ORDER BY row_number LIMIT 25 OFFSET $2`,
        [id, (page - 1) * 25],
      ),
      this.database.query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM public.org_structure_rows'),
    ]);
    return {
      id,
      fileName: preview.file_name,
      totalRows: preview.total_rows,
      existingRows: Number(existing.rows[0].count),
      filteredRows: preview.total_rows,
      page,
      rows: rows.rows.map((row) => ({ rowNumber: row.row_number, values: row.row_data })),
    };
  }

  async updateRow(id: string, actor: string, rowNumber: number, values: OrgStructureValues) {
    await this.database.transaction(async (client) => {
      await this.lockPreview(client, id, actor);
      const updated = await client.query(
        `UPDATE public.org_structure_preview_rows SET row_data = $3::JSONB
         WHERE preview_id = $1 AND row_number = $2`,
        [id, rowNumber, JSON.stringify(values)],
      );
      if (!updated.rowCount) throw new Error('ROW_NOT_FOUND');
    });
  }

  async deleteRow(id: string, actor: string, rowNumber: number) {
    await this.database.transaction(async (client) => {
      const preview = await this.lockPreview(client, id, actor);
      if (preview.total_rows <= 1) throw new Error('LAST_PREVIEW_ROW');
      const deleted = await client.query(
        'DELETE FROM public.org_structure_preview_rows WHERE preview_id = $1 AND row_number = $2',
        [id, rowNumber],
      );
      if (!deleted.rowCount) throw new Error('ROW_NOT_FOUND');
      await client.query(
        'UPDATE public.org_structure_previews SET total_rows = total_rows - 1 WHERE preview_id = $1',
        [id],
      );
    });
  }

  async cancel(id: string, actor: string): Promise<boolean> {
    const result = await this.database.query(
      `DELETE FROM public.org_structure_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'`,
      [id, actor],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async commit(id: string, actor: string, confirmed: boolean) {
    return this.database.transaction(async (client) => {
      await client.query("SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('org_structure_replace'))");
      const found = await client.query<Preview>(
        `SELECT preview_id, file_name, file_hash, total_rows, status, created_at
         FROM public.org_structure_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [id, actor],
      );
      const preview = found.rows[0];
      if (!preview) throw new Error('PREVIEW_NOT_FOUND');
      if (!confirmed) throw new Error('CONFIRM_REQUIRED');
      const newer = await client.query<{ exists: boolean }>(
        'SELECT EXISTS (SELECT 1 FROM public.org_structure_imports WHERE imported_at > $1) AS exists',
        [preview.created_at],
      );
      if (newer.rows[0].exists) throw new Error('STALE_PREVIEW');
      const existing = await client.query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM public.org_structure_rows');
      const replacedRows = Number(existing.rows[0].count);
      const imported = await client.query<{ import_id: string }>(
        `INSERT INTO public.org_structure_imports (file_name, file_hash, row_count, replaced_rows, imported_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING import_id`,
        [preview.file_name, preview.file_hash, preview.total_rows, replacedRows, actor],
      );
      const importId = imported.rows[0].import_id;
      await client.query('DELETE FROM public.org_structure_rows');
      const inserted = await client.query(
        `INSERT INTO public.org_structure_rows (
           import_id, source_row_number, role_title, reporting_to, jd_id, career_level, layer, order_by, is_active,
           grade, function
         )
         SELECT $2, r.row_number, BTRIM(COALESCE(v.role_title, '')), BTRIM(COALESCE(v.reporting_to, '')),
           BTRIM(COALESCE(v.jd_id, '')), BTRIM(COALESCE(v.career_level, '')),
           BTRIM(COALESCE(v.layer, '')),
           CASE WHEN BTRIM(v.order_by) ~ '^-?\\d{1,9}$' THEN BTRIM(v.order_by)::INTEGER END,
           LOWER(BTRIM(COALESCE(v.is_active, ''))) IN ('yes', 'true', '1', 'y'),
           BTRIM(COALESCE(v.grade, '')), BTRIM(COALESCE(v.function, ''))
         FROM public.org_structure_preview_rows r
         CROSS JOIN LATERAL JSONB_TO_RECORD(r.row_data) AS v(
           role_title TEXT, reporting_to TEXT, jd_id TEXT, career_level TEXT,
           layer TEXT, order_by TEXT, is_active TEXT, grade TEXT, function TEXT
         )
         WHERE r.preview_id = $1 ORDER BY r.row_number`,
        [id, importId],
      );
      if (inserted.rowCount !== preview.total_rows) throw new Error('ROW_COUNT_MISMATCH');
      await client.query("UPDATE public.org_structure_previews SET status = 'committed' WHERE preview_id = $1", [id]);
      return { importedRows: inserted.rowCount, replacedRows };
    });
  }

  async list() {
    const result = await this.database.query<{
      id: string;
      sourceRowNumber: number;
      roleTitle: string;
      reportingTo: string;
      jdId: string;
      careerLevel: string;
      layer: string;
      grade: string;
      function: string;
      orderBy: number | null;
      isActive: boolean;
      importedAt: string;
    }>(
      `SELECT r.id::TEXT AS id, r.source_row_number AS "sourceRowNumber", r.role_title AS "roleTitle",
         r.reporting_to AS "reportingTo", r.jd_id AS "jdId", r.career_level AS "careerLevel",
        r.layer, r.grade, r.function, r.order_by AS "orderBy", r.is_active AS "isActive",
        i.imported_at AS "importedAt"
       FROM public.org_structure_rows r
       JOIN public.org_structure_imports i ON i.import_id = r.import_id
       ORDER BY r.order_by ASC NULLS LAST, LOWER(r.role_title), r.source_row_number`,
    );
    return result.rows;
  }

  private async lockPreview(client: PoolClient, id: string, actor: string) {
    const result = await client.query<{ total_rows: number }>(
      `SELECT total_rows FROM public.org_structure_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
      [id, actor],
    );
    if (!result.rows.length) throw new Error('PREVIEW_NOT_FOUND');
    return result.rows[0];
  }
}