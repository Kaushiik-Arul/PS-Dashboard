import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../../database/database.service';
import { cleanAttritionStoredValues, cleanAttritionValues } from '../attrition-import/attrition-import.parser';
import type { AttritionFile, AttritionStoredValues } from '../attrition-import/attrition-import.types';
import { parsePsExitFile, validatePsExitRows } from './ps-exit-import.parser';
import { isPsExitRowSelected, psExitPeriod, psExitSelectablePeriods } from './ps-exit-period';
import type { PsExitPreviewFilter, PsExitRow } from './ps-exit-import.types';
import { reconcilePendingAttrition } from '../attrition-reconciliation.repository';

type PreviewLock = { file_name: string; file_hash: string };
type ExistingEvent = { pers_no: string; event_month: Date | string; source: string; transfer_type: string | null };

@Injectable()
export class PsExitImportService {
  constructor(private readonly database: DatabaseService) {}

  private uuid(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Invalid preview ID.');
    }
  }

  private async rangeMappings(client: PoolClient) {
    const result = await client.query<{ organizational_unit: string; range_value: string }>(
      'SELECT organizational_unit, range_value FROM public.org_unit_range_mappings',
    );
    return new Map(result.rows.map((row) => [row.organizational_unit.trim().toLowerCase(), row.range_value.trim()]));
  }

  private async previewLock(client: PoolClient, actor: string, id: string): Promise<PreviewLock> {
    this.uuid(id);
    const result = await client.query<PreviewLock>(
      `SELECT file_name, file_hash FROM public.ps_exit_previews
       WHERE preview_id = $1 AND uploaded_by_account_id = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
      [id, actor],
    );
    if (!result.rows[0]) throw new NotFoundException('Preview expired or was not found. Upload the workbook again.');
    return result.rows[0];
  }

  private dateKey(value: Date | string): string {
    if (!(value instanceof Date)) return String(value).slice(0, 7);
    return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }

  private async validatedRows(client: PoolClient, id: string): Promise<PsExitRow[]> {
    const found = await client.query<{ row_number: number; row_data: AttritionStoredValues }>(
      'SELECT row_number, row_data FROM public.ps_exit_preview_rows WHERE preview_id = $1 ORDER BY row_number',
      [id],
    );
    const rows = validatePsExitRows(
      found.rows.map((row) => ({ rowNumber: row.row_number, values: cleanAttritionStoredValues(row.row_data) })),
      await this.rangeMappings(client),
    );
    const persNos = [...new Set(rows.filter((row) => row.values.pers_no).map((row) => row.values.pers_no))];
    if (!persNos.length) return rows;
    const existing = await client.query<ExistingEvent>(
      `SELECT pers_no::text, event_month, source, transfer_type
       FROM public.employee_attrition_events
       WHERE deleted_at IS NULL AND pers_no = ANY($1::bigint[])`,
      [persNos],
    );
    const conflicts = new Set(existing.rows
      .filter((event) => !(event.source === 'ps_exit' || (event.source === 'rbin' && event.transfer_type === 'out_of_ps_within_rbin')))
      .map((event) => `${event.pers_no}:${this.dateKey(event.event_month)}`));
    for (const row of rows) {
      if (row.lwd && conflicts.has(`${row.values.pers_no}:${row.lwd.slice(0, 7)}`)) {
        row.issues.push({
          column: 'pers_no', code: 'event_conflict', severity: 'error',
          message: 'A reviewed, manual, or within-PS event already exists for this employee and LWD month.',
        });
      }
    }
    return rows;
  }

  private reconciliationRows(rows: readonly PsExitRow[], period: string): PsExitRow[] {
    const selected = rows
      .filter((row) => isPsExitRowSelected(row, period))
      .map((row) => ({ ...row, issues: [...row.issues] }));
    const counts = new Map<string, number>();
    for (const row of selected) counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1);
    for (const row of selected) {
      const count = counts.get(row.values.pers_no) ?? 0;
      if (row.values.pers_no && count > 1) row.issues.push({
        column: 'pers_no',
        code: 'reconciliation_duplicate',
        severity: 'error',
        message: `This employee has ${count} rows in the selected reconciliation scope.`,
        occurrences: count,
      });
    }
    return selected;
  }

  async upload(actor: string, file?: AttritionFile) {
    if (!file) throw new BadRequestException('Choose a PS Exit XLSX workbook.');
    if (file.buffer.length > 50 * 1024 * 1024) throw new BadRequestException('File exceeds 50 MB.');
    const parsedRows = await parsePsExitFile(file);
    const id = await this.database.transaction(async (client) => {
      await client.query('DELETE FROM public.ps_exit_previews WHERE expires_at <= CURRENT_TIMESTAMP');
      const rows = validatePsExitRows(parsedRows, await this.rangeMappings(client));
      const preview = await client.query<{ preview_id: string }>(
        `INSERT INTO public.ps_exit_previews (uploaded_by_account_id, file_name, file_hash)
         VALUES ($1, $2, $3) RETURNING preview_id`,
        [actor, file.originalname, createHash('sha256').update(file.buffer).digest('hex')],
      );
      await client.query(
        `INSERT INTO public.ps_exit_preview_rows (preview_id, row_number, row_data, issues)
         SELECT $1, item.row_number, item.row_data, item.issues
         FROM JSONB_TO_RECORDSET($2::jsonb) AS item(row_number integer, row_data jsonb, issues jsonb)`,
        [preview.rows[0].preview_id, JSON.stringify(rows.map((row) => ({ row_number: row.rowNumber, row_data: row.values, issues: row.issues })))],
      );
      return preview.rows[0].preview_id;
    });
    return this.preview(actor, id, 'all', '', '1');
  }

  async preview(actor: string, id: string, filterInput = 'all', periodInput = '', pageInput = '1') {
    if (!['all', 'warnings', 'errors'].includes(filterInput)) throw new BadRequestException('Invalid preview filter.');
    if (periodInput && !psExitPeriod(periodInput)) throw new BadRequestException('Invalid LWD period filter.');
    if (!/^[1-9]\d{0,4}$/.test(pageInput)) throw new BadRequestException('Invalid preview page.');
    const filter = filterInput as PsExitPreviewFilter;
    return this.database.transaction(async (client) => {
      const preview = await this.previewLock(client, actor, id);
      const rows = await this.validatedRows(client, id);
      const periodRows = periodInput ? this.reconciliationRows(rows, periodInput) : rows;
      const warningRows = periodRows.filter((row) => row.issues.some((issue) => issue.severity === 'warning')).length;
      const errorRows = periodRows.filter((row) => row.issues.some((issue) => issue.severity === 'error')).length;
      const selected = filter === 'all' ? periodRows : periodRows.filter((row) => row.issues.some((issue) => issue.severity === filter.slice(0, -1)));
      const page = Math.min(Number(pageInput), Math.max(1, Math.ceil(selected.length / 25)));
      const validDates = rows.map((row) => row.lwd).filter(Boolean).sort();
      const periods = psExitSelectablePeriods(rows);
      const selection = periodInput ? psExitPeriod(periodInput) : null;
      return {
        id, fileName: preview.file_name, totalRows: periodRows.length, warningRows, errorRows,
        minimumLwd: validDates[0] ?? null, maximumLwd: validDates.at(-1) ?? null,
        retainedPeriod: validDates.at(-1)?.slice(0, 7) ?? null, periods, period: periodInput,
        carryoverDate: selection?.carryoverDate ?? null,
        excludedMonthEndDate: selection?.excludedMonthEndDate ?? null,
        carryoverRows: selection ? periodRows.filter((row) => row.lwd === selection.carryoverDate).length : 0,
        filteredRows: selected.length, page, rows: selected.slice((page - 1) * 25, page * 25),
      };
    });
  }

  async editPreview(actor: string, id: string, rowInput: string, input?: unknown) {
    if (!/^[1-9]\d{0,5}$/.test(rowInput)) throw new BadRequestException('Invalid Excel row number.');
    const values = input === undefined ? undefined : cleanAttritionValues(input);
    await this.database.transaction(async (client) => {
      await this.previewLock(client, actor, id);
      let result;
      if (values) {
        const previous = await client.query<{ row_data: AttritionStoredValues }>(
          'SELECT row_data FROM public.ps_exit_preview_rows WHERE preview_id = $1 AND row_number = $2',
          [id, Number(rowInput)],
        );
        if (!previous.rows[0]) throw new NotFoundException('Preview row was not found.');
        const oldValues = cleanAttritionStoredValues(previous.rows[0].row_data);
        const rangeSource = values.range === oldValues.range ? oldValues.range_source : values.range ? 'uploaded' : 'missing';
        const [validated] = validatePsExitRows(
          [{ rowNumber: Number(rowInput), values: { ...values, range_source: rangeSource } }],
          await this.rangeMappings(client),
        );
        result = await client.query(
          `UPDATE public.ps_exit_preview_rows SET row_data = $3::jsonb, issues = $4::jsonb
           WHERE preview_id = $1 AND row_number = $2`,
          [id, Number(rowInput), JSON.stringify(validated.values), JSON.stringify(validated.issues)],
        );
      } else {
        const count = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM public.ps_exit_preview_rows WHERE preview_id = $1', [id]);
        if (Number(count.rows[0]?.count ?? 0) <= 1) throw new ConflictException('The final preview row cannot be deleted.');
        result = await client.query('DELETE FROM public.ps_exit_preview_rows WHERE preview_id = $1 AND row_number = $2', [id, Number(rowInput)]);
      }
      if (!result.rowCount) throw new NotFoundException('Preview row was not found.');
    });
  }

  async cancel(actor: string, id: string) {
    await this.database.transaction(async (client) => {
      await this.previewLock(client, actor, id);
      await client.query('DELETE FROM public.ps_exit_previews WHERE preview_id = $1', [id]);
    });
  }

  async commit(actor: string, id: string, confirmed: unknown, periodInput: unknown) {
    if (confirmed !== true) throw new BadRequestException('Confirm the PS Exit import.');
    if (typeof periodInput !== 'string' || !psExitPeriod(periodInput)) {
      throw new BadRequestException('Select one LWD month before saving.');
    }
    return this.database.transaction(async (client) => {
      await client.query(`SELECT PG_ADVISORY_XACT_LOCK(HASHTEXT('ps-exit-import'))`);
      const preview = await this.previewLock(client, actor, id);
      const selection = psExitPeriod(periodInput)!;
      const rows = this.reconciliationRows(await this.validatedRows(client, id), periodInput);
      if (!rows.length) throw new ConflictException('The preview does not contain any rows.');
      if (rows.some((row) => row.issues.some((issue) => issue.severity === 'error'))) {
        throw new ConflictException('Resolve every blocking error before import.');
      }
      const dates = rows.map((row) => row.lwd).sort();
      const maximumLwd = dates.at(-1)!;
      const retainedPeriod = maximumLwd.slice(0, 7);
      const imported = await client.query<{ import_id: string }>(
        `INSERT INTO public.ps_exit_imports
           (file_name, file_hash, row_count, minimum_lwd, maximum_lwd, retained_month,
            reconciliation_month, imported_by_account_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING import_id`,
        [preview.file_name, preview.file_hash, rows.length, dates[0], maximumLwd,
          `${retainedPeriod}-01`, selection.periodStart, actor],
      );
      const importId = imported.rows[0].import_id;
      const payload = rows.map((row) => ({
        row_number: row.rowNumber, ...row.values, initiated_date: row.initiatedDate || null,
        lwd: row.lwd, classification: row.classification,
      }));
      await client.query('DELETE FROM public.ps_exit_rows');
      await client.query(
        `INSERT INTO public.ps_exit_rows (
           import_id, source_row_number, pers_no, personnel_number, ps_group, gender_key,
           filter_value, reason_for_action, detailed_reason_approved, org_unit, range_value,
           initiated_date, lwd, e_separation_request_no, to_org_unit, classification
         )
         SELECT $1, item.row_number, item.pers_no::bigint, NULLIF(item.employee_name, ''),
           NULLIF(item.ps_group, ''), NULLIF(item.gender_key, ''), NULLIF(item.filter_value, ''),
           item.reason_for_action, NULLIF(item.detailed_reason_approved, ''), NULLIF(item.org_unit, ''),
           NULLIF(item.range, ''), item.initiated_date::date, item.lwd::date,
           NULLIF(item.e_separation_request_no, ''), NULLIF(item.to_org_unit, ''), item.classification
         FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
           row_number integer, pers_no text, employee_name text, ps_group text, gender_key text,
           filter_value text, reason_for_action text, detailed_reason_approved text, org_unit text,
           range text, initiated_date date, lwd date, e_separation_request_no text, to_org_unit text,
           classification text
         )`,
        [importId, JSON.stringify(payload)],
      );
      const pending = await client.query<{ candidate_id: string }>(
        `WITH input AS (
           SELECT * FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             pers_no text, reason_for_action text, detailed_reason_approved text,
             org_unit text, range text, lwd date
           )
         )
         INSERT INTO public.attrition_departure_candidates (
           pers_no, detected_month, previous_organisational_area_pa,
           previous_organizational_unit, previous_range, previous_range_type,
           source, ps_exit_import_id, exit_lwd, exit_reason,
           resolution_note, created_by_account_id
         )
         SELECT input.pers_no::bigint, $4::date, 'PS',
           NULLIF(input.org_unit, ''), NULLIF(input.range, ''),
           CASE WHEN NULLIF(BTRIM(input.range), '') IS NULL THEN NULL
             WHEN UPPER(BTRIM(input.range)) IN ('BIDP', 'NAP', 'JAP', 'GANP') THEN 'plant'
             ELSE 'corporate' END,
           'ps_exit', $1, input.lwd, input.reason_for_action,
           NULLIF(input.detailed_reason_approved, ''), $3
         FROM input
         ON CONFLICT (source, pers_no, detected_month) DO UPDATE SET
           ps_exit_import_id = EXCLUDED.ps_exit_import_id,
           exit_lwd = EXCLUDED.exit_lwd,
           exit_reason = EXCLUDED.exit_reason,
           previous_organizational_unit = EXCLUDED.previous_organizational_unit,
           previous_range = EXCLUDED.previous_range,
           previous_range_type = EXCLUDED.previous_range_type,
           resolution_note = EXCLUDED.resolution_note,
           created_by_account_id = EXCLUDED.created_by_account_id,
           updated_at = CURRENT_TIMESTAMP
         WHERE attrition_departure_candidates.status = 'pending'
         RETURNING candidate_id`,
        [importId, JSON.stringify(payload), actor, selection.periodStart],
      );
      const matchedCandidates = await reconcilePendingAttrition(client, actor);
      const remaining = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM public.attrition_departure_candidates
         WHERE source = 'ps_exit' AND status = 'pending' AND ps_exit_import_id = $1`,
        [importId],
      );
      await client.query('DELETE FROM public.ps_exit_previews WHERE preview_id = $1', [id]);
      return {
        importedRows: rows.length, retainedRows: rows.length,
        retainedPeriod, carryoverRows: rows.filter((row) => row.lwd === selection.carryoverDate).length,
        insertedEvents: matchedCandidates, updatedEvents: 0, matchedCandidates,
        pendingPsExit: Number(remaining.rows[0]?.count ?? pending.rowCount ?? 0),
      };
    });
  }
}