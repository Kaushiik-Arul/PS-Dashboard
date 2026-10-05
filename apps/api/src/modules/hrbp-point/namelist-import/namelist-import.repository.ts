import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';
import type {
  NamelistPreviewPage,
  NamelistPreviewSummary,
  NamelistImportMode,
  ParsedNamelistRow,
  PreviewFilter,
  UploadedNamelistFile,
} from './namelist-import.types';

type PreviewRecord = {
  preview_id: string;
  file_name: string;
  reporting_month: Date | string;
  import_mode: NamelistImportMode;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
};

type StoredRow = {
  row_number: number;
  row_data: ParsedNamelistRow['values'];
  issues: ParsedNamelistRow['issues'];
};

type LiveImportRecord = {
  id: string;
  reporting_month: Date | string;
};

function mapMonth(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 7) : value.slice(0, 7);
}

@Injectable()
export class NamelistImportRepository {
  constructor(private readonly database: DatabaseService) {}

  async createPreview(
    actorAccountId: string,
    file: UploadedNamelistFile,
    rows: ParsedNamelistRow[],
    reportingMonth: string,
  ): Promise<string> {
    return this.createPreviewForMonth(actorAccountId, file, rows, reportingMonth, 'live');
  }

  async createHistoricalPreview(
    actorAccountId: string,
    file: UploadedNamelistFile,
    rows: ParsedNamelistRow[],
    reportingMonth: string,
  ): Promise<string> {
    return this.createPreviewForMonth(actorAccountId, file, rows, reportingMonth, 'historical');
  }

  private async createPreviewForMonth(
    actorAccountId: string,
    file: UploadedNamelistFile,
    rows: ParsedNamelistRow[],
    reportingMonth: string,
    importMode: NamelistImportMode,
  ): Promise<string> {
    return this.database.transaction(async (client) => {
      await client.query(`DELETE FROM public.namelist_import_previews WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP`);
      const validRows = rows.filter((row) => row.issues.length === 0).length;
      const preview = await client.query<{ preview_id: string }>(
        `INSERT INTO public.namelist_import_previews (
           uploaded_by, reporting_month, import_mode, file_name, file_hash,
           total_rows, valid_rows, invalid_rows
         ) VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)
         RETURNING preview_id`,
        [actorAccountId, reportingMonth, importMode, file.originalname, createHash('sha256').update(file.buffer).digest('hex'), rows.length, validRows, rows.length - validRows],
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
      `SELECT preview_id, file_name, reporting_month, import_mode, total_rows, valid_rows, invalid_rows
       FROM public.namelist_import_previews
       WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP`,
      [previewId, actorAccountId],
    );
    if (!preview.rows[0]) return null;
    const record = preview.rows[0];
    const hasExistingMonthImport = record.import_mode === 'historical'
      ? await this.hasHistoricalMonthImport(record.reporting_month)
      : await this.hasCurrentMonthImport(record.reporting_month);
    return this.buildSummary(record, hasExistingMonthImport);
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
        `SELECT preview_id, file_name, reporting_month, import_mode, total_rows, valid_rows, invalid_rows
         FROM public.namelist_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [previewId, actorAccountId],
      );
      const record = preview.rows[0];
      if (!record) throw new Error('PREVIEW_NOT_FOUND');
      if (record.import_mode !== 'live') throw new Error('PREVIEW_MODE_MISMATCH');
      if (record.invalid_rows > 0) throw new Error('INVALID_ROWS');
      if ((await this.hasCurrentMonthImport(record.reporting_month, client)) && !confirmReplacement) throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');

      const currentLiveImport = await this.getCurrentLiveImport(client);
      if (currentLiveImport && mapMonth(record.reporting_month) < mapMonth(currentLiveImport.reporting_month)) {
        throw new Error('LIVE_MONTH_OUT_OF_SEQUENCE');
      }
      if (currentLiveImport && mapMonth(record.reporting_month) > mapMonth(currentLiveImport.reporting_month)) {
        await this.copyLiveToMonthly(currentLiveImport, client);
      }

      const audit = await client.query<{ id: string }>(
        `INSERT INTO public.namelist_imports (
           reporting_month, reporting_month_confirmed, import_mode,
           imported_by, file_name, total_rows, status
         ) VALUES ($1, TRUE, 'live', $2, $3, $4, 'processing') RETURNING id::text`,
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
      await this.enforceDetailedRetention(actorAccountId, client);
      return record.total_rows;
    });
  }

  async commitHistorical(previewId: string, actorAccountId: string, confirmReplacement: boolean): Promise<number> {
    return this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('employee_namelist_import'))`);
      const preview = await client.query<PreviewRecord>(
        `SELECT preview_id, file_name, reporting_month, import_mode, total_rows, valid_rows, invalid_rows
         FROM public.namelist_import_previews
         WHERE preview_id = $1 AND uploaded_by = $2 AND status = 'ready'
           AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [previewId, actorAccountId],
      );
      const record = preview.rows[0];
      if (!record) throw new Error('PREVIEW_NOT_FOUND');
      if (record.import_mode !== 'historical') throw new Error('PREVIEW_MODE_MISMATCH');
      if (record.invalid_rows > 0) throw new Error('INVALID_ROWS');
      const currentLiveImport = await this.getCurrentLiveImport(client);
      if (currentLiveImport && mapMonth(record.reporting_month) >= mapMonth(currentLiveImport.reporting_month)) {
        throw new Error('HISTORICAL_MONTH_NOT_BEFORE_LIVE');
      }
      if ((await this.hasHistoricalMonthImport(record.reporting_month, client)) && !confirmReplacement) {
        throw new Error('REPLACEMENT_CONFIRMATION_REQUIRED');
      }

      const audit = await client.query<{ id: string }>(
        `INSERT INTO public.namelist_imports (
           reporting_month, reporting_month_confirmed, import_mode,
           imported_by, file_name, total_rows, status
         ) VALUES ($1, TRUE, 'historical', $2, $3, $4, 'processing') RETURNING id::text`,
        [record.reporting_month, actorAccountId, record.file_name, record.total_rows],
      );
      await client.query(
        `DELETE FROM public.employee_namelist_monthly WHERE reporting_month = $1`,
        [record.reporting_month],
      );
      await client.query(
        `INSERT INTO public.employee_namelist_monthly (
           reporting_month, source_import_id, pers_no, personnel_number, employee_group,
           lp, esgrp, employee_subgroup, ps_group, organizational_unit, range, function,
           organisational_area_pa, gender_key, location, pa, personnel_area, psubarea,
           personnel_subarea, nt_id, global_id, cost_center, birth_date, joining_date,
           entry_for_retirement, designation_text, hrbp_global_id, hrbp2_global_id,
           official_email, technical_entry_date, direct_or_indirect
         ) SELECT
           $2::date, $3::bigint, (row_data->>'pers_no')::bigint,
           row_data->>'personnel_number', row_data->>'employee_group', row_data->>'lp',
           row_data->>'esgrp', row_data->>'employee_subgroup', row_data->>'ps_group',
           row_data->>'organizational_unit', row_data->>'range', NULLIF(row_data->>'function', ''),
           row_data->>'organisational_area_pa', row_data->>'gender_key', row_data->>'location',
           row_data->>'pa', row_data->>'personnel_area', row_data->>'psubarea',
           row_data->>'personnel_subarea', row_data->>'nt_id', (row_data->>'global_id')::bigint,
           row_data->>'cost_center', (row_data->>'birth_date')::date,
           (row_data->>'joining_date')::date, (row_data->>'entry_for_retirement')::date,
           row_data->>'designation_text', (row_data->>'hrbp_global_id')::bigint,
           row_data->>'hrbp2_global_id', row_data->>'official_email',
           (row_data->>'technical_entry_date')::date, row_data->>'direct_or_indirect'
         FROM public.namelist_import_preview_rows
         WHERE preview_id = $1 ORDER BY row_number`,
        [previewId, record.reporting_month, audit.rows[0].id],
      );
      await client.query(`UPDATE public.namelist_imports SET status = 'completed' WHERE id = $1`, [audit.rows[0].id]);
      await client.query(`UPDATE public.namelist_import_previews SET status = 'committed' WHERE preview_id = $1`, [previewId]);
      await this.enforceDetailedRetention(actorAccountId, client);
      return record.total_rows;
    });
  }

  private async getCurrentLiveImport(client: Pick<DatabaseService, 'query'>): Promise<LiveImportRecord | null> {
    const result = await client.query<LiveImportRecord>(
      `SELECT id::text, reporting_month
       FROM public.namelist_imports
       WHERE reporting_month_confirmed
         AND import_mode = 'live' AND status = 'completed'
       ORDER BY reporting_month DESC, imported_at DESC, id DESC
       LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }

  private async copyLiveToMonthly(
    currentLiveImport: LiveImportRecord,
    client: Pick<DatabaseService, 'query'>,
  ): Promise<void> {
    await client.query(
      `DELETE FROM public.employee_namelist_monthly WHERE reporting_month = $1`,
      [currentLiveImport.reporting_month],
    );
    await client.query(
      `INSERT INTO public.employee_namelist_monthly (
         reporting_month, source_import_id, pers_no, personnel_number, employee_group,
         lp, esgrp, employee_subgroup, ps_group, organizational_unit, range, function,
         organisational_area_pa, gender_key, location, pa, personnel_area, psubarea,
         personnel_subarea, nt_id, global_id, cost_center, birth_date, joining_date,
         entry_for_retirement, designation_text, hrbp_global_id, hrbp2_global_id,
         official_email, technical_entry_date, direct_or_indirect
       ) SELECT
         $1::date, $2::bigint, pers_no, personnel_number, employee_group,
         lp, esgrp, employee_subgroup, ps_group, organizational_unit, range, function,
         organisational_area_pa, gender_key, location, pa, personnel_area, psubarea,
         personnel_subarea, nt_id, global_id, cost_center, birth_date, joining_date,
         entry_for_retirement, designation_text, hrbp_global_id, hrbp2_global_id,
         official_email, technical_entry_date, direct_or_indirect
       FROM public.employee_namelist`,
      [currentLiveImport.reporting_month, currentLiveImport.id],
    );
  }

  private async enforceDetailedRetention(
    actorAccountId: string,
    client: Pick<DatabaseService, 'query'>,
  ): Promise<void> {
    const expired = await client.query<{ reporting_month: Date | string }>(
      `WITH current_live AS (
         SELECT reporting_month
         FROM public.namelist_imports
         WHERE reporting_month_confirmed
           AND import_mode = 'live' AND status = 'completed'
         ORDER BY reporting_month DESC, imported_at DESC, id DESC
         LIMIT 1
       ), available_months AS (
         SELECT reporting_month FROM current_live
         UNION
         SELECT DISTINCT reporting_month FROM public.employee_namelist_monthly
       )
       SELECT reporting_month
       FROM available_months
       ORDER BY reporting_month DESC
       OFFSET 3`,
    );

    for (const row of expired.rows) {
      await this.archiveOverviewMonth(row.reporting_month, actorAccountId, client);
      await client.query(
        `DELETE FROM public.employee_namelist_monthly WHERE reporting_month = $1`,
        [row.reporting_month],
      );
    }
  }

  private async archiveOverviewMonth(
    reportingMonth: Date | string,
    actorAccountId: string,
    client: Pick<DatabaseService, 'query'>,
  ): Promise<void> {
    const sourceImport = await client.query<{ source_import_id: string | null }>(
      `SELECT MAX(source_import_id)::text AS source_import_id
       FROM public.employee_namelist_monthly
       WHERE reporting_month = $1`,
      [reportingMonth],
    );
    const snapshot = await client.query<{ id: string; checksum: string }>(
      `WITH next_version AS (
         SELECT COALESCE(MAX(version), 0) + 1 AS version
         FROM public.dashboard_json_snapshots
         WHERE dashboard_key = 'overview' AND reporting_month = $1
       ), payload AS (
         SELECT JSONB_BUILD_OBJECT(
           'kpis', public.get_workforce_kpis(
             ($1::date + INTERVAL '1 month - 1 day')::date,
             NULL, NULL, NULL, NULL, NULL, NULL, $2::uuid, $1::date
           ),
           'charts', public.get_workforce_charts(
             ($1::date + INTERVAL '1 month - 1 day')::date,
             NULL, NULL, NULL, NULL, NULL, NULL, $2::uuid, $1::date
           ),
           'reportingMonth', TO_CHAR($1::date, 'YYYY-MM'),
           'filterOptions', JSONB_BUILD_OBJECT(
             'functionName', '[]'::jsonb,
             'orgUnit', '[]'::jsonb,
             'range', '[]'::jsonb,
             'location', '[]'::jsonb,
             'gender', '[]'::jsonb,
             'directOrIndirect', '[]'::jsonb
           )
         ) AS value
       ), deactivate AS (
         UPDATE public.dashboard_json_snapshots
         SET is_active = FALSE
         WHERE dashboard_key = 'overview' AND reporting_month = $1 AND is_active
       )
       INSERT INTO public.dashboard_json_snapshots (
         dashboard_key, reporting_month, version, payload, checksum,
         source_import_id, created_by, is_active
       )
       SELECT 'overview', $1::date, next_version.version, payload.value,
              MD5(payload.value::text), $3::bigint, $2::uuid, TRUE
       FROM next_version CROSS JOIN payload
       RETURNING id::text, checksum`,
      [reportingMonth, actorAccountId, sourceImport.rows[0]?.source_import_id ?? null],
    );
    const stored = snapshot.rows[0];
    if (!stored) throw new Error('SNAPSHOT_VERIFICATION_FAILED');
    const verification = await client.query<{ verified: boolean }>(
      `SELECT checksum = MD5(payload::text) AS verified
       FROM public.dashboard_json_snapshots WHERE id = $1::bigint`,
      [stored.id],
    );
    if (!verification.rows[0]?.verified) throw new Error('SNAPSHOT_VERIFICATION_FAILED');
  }

  private buildSummary(record: PreviewRecord, hasExistingMonthImport: boolean): NamelistPreviewSummary {
    return {
      id: record.preview_id,
      fileName: record.file_name,
      reportingMonth: mapMonth(record.reporting_month),
      importMode: record.import_mode,
      totalRows: record.total_rows,
      validRows: record.valid_rows,
      invalidRows: record.invalid_rows,
      hasExistingMonthImport,
    };
  }

  private async hasCurrentMonthImport(reportingMonth: Date | string, client: Pick<DatabaseService, 'query'> = this.database): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM public.namelist_imports
         WHERE reporting_month = $1 AND reporting_month_confirmed
           AND import_mode = 'live' AND status = 'completed'
       ) AS exists`,
      [reportingMonth],
    );
    return result.rows[0]?.exists ?? false;
  }

  private async hasHistoricalMonthImport(reportingMonth: Date | string, client: Pick<DatabaseService, 'query'> = this.database): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM public.namelist_imports
         WHERE reporting_month = $1 AND reporting_month_confirmed
           AND import_mode = 'historical' AND status = 'completed'
       ) AS exists`,
      [reportingMonth],
    );
    return result.rows[0]?.exists ?? false;
  }

}