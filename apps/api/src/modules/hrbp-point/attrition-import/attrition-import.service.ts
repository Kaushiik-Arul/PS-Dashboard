import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../../database/database.service';
import {
  cleanAttritionStoredValues,
  cleanAttritionValues,
  parseAttritionFile,
  validateAttritionRows,
} from './attrition-import.parser';
import type {
  AttritionFile,
  AttritionStoredValues,
} from './attrition-import.types';

@Injectable()
export class AttritionImportService {
  constructor(private readonly database: DatabaseService) {}

  private uuid(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      throw new BadRequestException('Invalid preview ID.');
  }

  private async rangeMappings(client: PoolClient) {
    const result = await client.query<{
      organizational_unit: string;
      range_value: string;
    }>(
      `SELECT organizational_unit, range_value
       FROM public.org_unit_range_mappings`,
    );
    return new Map(
      result.rows.map((row) => [
        row.organizational_unit.trim().toLowerCase(),
        row.range_value.trim(),
      ]),
    );
  }

  private async lockState(client: PoolClient) {
    const result = await client.query<{ revision: string }>(
      `SELECT revision::TEXT AS revision
       FROM public.attrition_state
       WHERE singleton = TRUE FOR UPDATE`,
    );
    return result.rows[0].revision;
  }

  private async previewLock(client: PoolClient, actor: string, id: string) {
    this.uuid(id);
    const result = await client.query<{
      file_name: string;
      file_hash: string;
      base_revision: string;
    }>(
      `SELECT file_name, file_hash, base_revision::TEXT AS base_revision
       FROM public.attrition_previews
       WHERE id = $1 AND uploaded_by = $2 AND status = 'ready'
         AND expires_at > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [id, actor],
    );
    if (!result.rows[0])
      throw new NotFoundException(
        'Preview expired or was not found. Upload the workbook again.',
      );
    return result.rows[0];
  }

  private async validatedRows(client: PoolClient, id: string) {
    const found = await client.query<{
      row_number: number;
      row_data: AttritionStoredValues;
    }>(
      `SELECT row_number, row_data
       FROM public.attrition_preview_rows
       WHERE preview_id = $1 ORDER BY row_number`,
      [id],
    );
    return validateAttritionRows(
      found.rows.map((row) => ({
        rowNumber: row.row_number,
        values: cleanAttritionStoredValues(row.row_data),
      })),
      await this.rangeMappings(client),
    );
  }

  async upload(actor: string, file?: AttritionFile) {
    if (!file)
      throw new BadRequestException('Choose an Attrition XLSX workbook.');
    if (file.buffer.length > 50 * 1024 * 1024)
      throw new BadRequestException('File exceeds 50 MB.');
    const parsedRows = await parseAttritionFile(file);
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client);
      const rows = validateAttritionRows(
        parsedRows,
        await this.rangeMappings(client),
      );
      const preview = await client.query<{ id: string }>(
        `INSERT INTO public.attrition_previews
           (base_revision, uploaded_by, file_name, file_hash)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          revision,
          actor,
          file.originalname,
          createHash('sha256').update(file.buffer).digest('hex'),
        ],
      );
      const id = preview.rows[0].id;
      await client.query(
        `INSERT INTO public.attrition_preview_rows
           (preview_id, row_number, row_data, issues)
         SELECT $1, item.row_number, item.row_data, item.issues
         FROM JSONB_TO_RECORDSET($2::JSONB) AS item(
           row_number INTEGER, row_data JSONB, issues JSONB
         )`,
        [
          id,
          JSON.stringify(
            rows.map((row) => ({
              row_number: row.rowNumber,
              row_data: row.values,
              issues: row.issues,
            })),
          ),
        ],
      );
      return { id };
    });
  }

  async preview(actor: string, id: string, filter = 'all', pageInput = '1') {
    if (!['all', 'warnings', 'errors'].includes(filter))
      throw new BadRequestException('Invalid preview filter.');
    if (!/^[1-9]\d{0,4}$/.test(pageInput))
      throw new BadRequestException('Invalid preview page.');
    return this.database.transaction(async (client) => {
      const preview = await this.previewLock(client, actor, id);
      const rows = await this.validatedRows(client, id);
      const warningRows = rows.filter((row) =>
        row.issues.some((issue) => issue.severity === 'warning'),
      ).length;
      const errorRows = rows.filter((row) =>
        row.issues.some((issue) => issue.severity === 'error'),
      ).length;
      const selected = filter === 'all'
        ? rows
        : rows.filter((row) =>
            row.issues.some((issue) => issue.severity === filter.slice(0, -1)),
          );
      const page = Math.min(
        Number(pageInput),
        Math.max(1, Math.ceil(selected.length / 25)),
      );
      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::TEXT AS count FROM public.attrition_rows',
      );
      return {
        id,
        fileName: preview.file_name,
        totalRows: rows.length,
        warningRows,
        errorRows,
        existingRows: Number(existing.rows[0].count),
        filteredRows: selected.length,
        page,
        rows: selected.slice((page - 1) * 25, page * 25),
      };
    });
  }

  async editPreview(
    actor: string,
    id: string,
    rowInput: string,
    input?: unknown,
  ) {
    if (!/^[1-9]\d{0,5}$/.test(rowInput))
      throw new BadRequestException('Invalid Excel row number.');
    const values = input === undefined ? undefined : cleanAttritionValues(input);
    await this.database.transaction(async (client) => {
      await this.previewLock(client, actor, id);
      if (!values) {
        const count = await client.query<{ count: string }>(
          `SELECT COUNT(*)::TEXT AS count
           FROM public.attrition_preview_rows WHERE preview_id = $1`,
          [id],
        );
        if (Number(count.rows[0].count) <= 1)
          throw new ConflictException(
            'The final preview row cannot be deleted. Cancel the preview instead.',
          );
      }

      let result;
      if (values) {
        const previous = await client.query<{ row_data: AttritionStoredValues }>(
          `SELECT row_data FROM public.attrition_preview_rows
           WHERE preview_id = $1 AND row_number = $2`,
          [id, Number(rowInput)],
        );
        if (!previous.rows[0])
          throw new NotFoundException('Preview row was not found.');
        const oldValues = cleanAttritionStoredValues(previous.rows[0].row_data);
        const inputSource = (input as Record<string, unknown>).range_source;
        let rangeSource: AttritionStoredValues['range_source'];
        if (inputSource === 'uploaded') rangeSource = 'uploaded';
        else if (
          oldValues.range_source === 'inferred' &&
          values.range === oldValues.range &&
          values.org_unit === oldValues.org_unit
        ) rangeSource = 'inferred';
        else rangeSource = values.range ? 'uploaded' : 'missing';
        if (
          oldValues.range_source === 'inferred' &&
          values.org_unit !== oldValues.org_unit &&
          values.range === oldValues.range
        ) {
          values.range = '';
          rangeSource = 'missing';
        }
        const [validated] = validateAttritionRows(
          [{ rowNumber: Number(rowInput), values: { ...values, range_source: rangeSource } }],
          await this.rangeMappings(client),
        );
        result = await client.query(
          `UPDATE public.attrition_preview_rows
           SET row_data = $3::JSONB, issues = $4::JSONB
           WHERE preview_id = $1 AND row_number = $2`,
          [
            id,
            Number(rowInput),
            JSON.stringify(validated.values),
            JSON.stringify(validated.issues),
          ],
        );
      } else {
        result = await client.query(
          `DELETE FROM public.attrition_preview_rows
           WHERE preview_id = $1 AND row_number = $2`,
          [id, Number(rowInput)],
        );
      }
      if (!result.rowCount)
        throw new NotFoundException('Preview row was not found.');
    });
  }

  async cancel(actor: string, id: string) {
    await this.database.transaction(async (client) => {
      await this.previewLock(client, actor, id);
      await client.query('DELETE FROM public.attrition_previews WHERE id = $1', [id]);
    });
  }

  async commit(actor: string, id: string, confirmed: unknown) {
    if (confirmed !== true)
      throw new BadRequestException(
        'Confirm replacement of every current Attrition row.',
      );
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client);
      const preview = await this.previewLock(client, actor, id);
      if (preview.base_revision !== revision)
        throw new ConflictException(
          'The Attrition data changed after this preview. Upload the workbook again.',
        );
      const rows = await this.validatedRows(client, id);
      if (!rows.length)
        throw new ConflictException('The preview does not contain any rows.');
      if (rows.some((row) => row.issues.some((issue) => issue.severity === 'error')))
        throw new ConflictException('Resolve every blocking error before import.');
      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::TEXT AS count FROM public.attrition_rows',
      );
      const replacedRows = Number(existing.rows[0].count);
      const imported = await client.query<{ id: string }>(
        `INSERT INTO public.attrition_imports
           (file_name, file_hash, row_count, replaced_rows, imported_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [preview.file_name, preview.file_hash, rows.length, replacedRows, actor],
      );
      await client.query('DELETE FROM public.attrition_rows');
      await client.query(
        `INSERT INTO public.attrition_rows (
           pers_no, employee_name, ps_group, gender_key, filter_value,
           reason_for_action, detailed_reason_approved, org_unit, range,
           initiated_date_raw, initiated_date, lwd_raw, lwd,
           e_separation_request_no, to_org_unit, import_id,
           updated_by_account_id
         )
         SELECT
           v.pers_no::BIGINT, NULLIF(v.employee_name, ''), NULLIF(v.ps_group, ''),
           NULLIF(v.gender_key, ''), NULLIF(v.filter_value, ''),
           NULLIF(v.reason_for_action, ''), NULLIF(v.detailed_reason_approved, ''),
           NULLIF(v.org_unit, ''), NULLIF(v.range, ''),
           NULLIF(v.initiated_date_raw, ''), NULLIF(v.initiated_date, '')::DATE,
           NULLIF(v.lwd_raw, ''), NULLIF(v.lwd, '')::DATE,
           NULLIF(v.e_separation_request_no, ''), NULLIF(v.to_org_unit, ''),
           $2::UUID, $3::UUID
         FROM JSONB_TO_RECORDSET($1::JSONB) AS v(
           pers_no TEXT, employee_name TEXT, ps_group TEXT, gender_key TEXT,
           filter_value TEXT, reason_for_action TEXT,
           detailed_reason_approved TEXT, org_unit TEXT, range TEXT,
           initiated_date_raw TEXT, initiated_date TEXT, lwd_raw TEXT,
           lwd TEXT, e_separation_request_no TEXT, to_org_unit TEXT
         )`,
        [
          JSON.stringify(rows.map((row) => ({
            ...row.values,
            initiated_date: row.initiatedDate,
            lwd: row.lwd,
          }))),
          imported.rows[0].id,
          actor,
        ],
      );
      await client.query(
        'UPDATE public.attrition_state SET revision = revision + 1 WHERE singleton = TRUE',
      );
      await client.query(
        `UPDATE public.attrition_previews SET status = 'committed' WHERE id = $1`,
        [id],
      );
      return { importedRows: rows.length, replacedRows };
    });
  }
}