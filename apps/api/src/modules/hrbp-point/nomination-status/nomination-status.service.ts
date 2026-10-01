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
  cleanNominationStatusValues,
  parseNominationStatusFile,
  validateNominationStatusRow,
} from './nomination-status.parser';
import {
  hasNominationStatusErrors,
  nominationStatusColumns,
  type NominationStatusFile,
  type NominationStatusValues,
} from './nomination-status.types';

@Injectable()
export class NominationStatusService {
  constructor(private readonly database: DatabaseService) {}

  private uuid(id: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new BadRequestException('Invalid preview ID.');
  }

  private async lockState(client: PoolClient) {
    const result = await client.query<{ revision: string }>(
      'SELECT revision::TEXT FROM public.nomination_status_state WHERE singleton = TRUE FOR UPDATE',
    );
    return result.rows[0].revision;
  }

  async upload(actor: string, file?: NominationStatusFile) {
    if (!file)
      throw new BadRequestException('Choose a CSV or XLSX file.');
    if (file.buffer.length > 50 * 1024 * 1024)
      throw new BadRequestException('File exceeds 50 MB.');
    const rows = await parseNominationStatusFile(file);
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client);
      const result = await client.query<{ id: string }>(
        `INSERT INTO public.nomination_status_previews
          (base_revision, uploaded_by, file_name, file_hash)
        VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          revision,
          actor,
          file.originalname,
          createHash('sha256').update(file.buffer).digest('hex'),
        ],
      );
      const id = result.rows[0].id;
      await client.query(
        `INSERT INTO public.nomination_status_preview_rows
          (preview_id, row_number, row_data)
        SELECT $1, row."rowNumber", row.values
        FROM JSONB_TO_RECORDSET($2::JSONB)
          AS row("rowNumber" INTEGER, values JSONB)`,
        [id, JSON.stringify(rows)],
      );
      return { id };
    });
  }

  private async previewLock(client: PoolClient, actor: string, id: string) {
    this.uuid(id);
    const result = await client.query<{
      id: string;
      file_name: string;
      file_hash: string;
      base_revision: string;
    }>(
      `SELECT id, file_name, file_hash, base_revision::TEXT
      FROM public.nomination_status_previews
      WHERE id = $1 AND uploaded_by = $2 AND status = 'ready'
        AND expires_at > CURRENT_TIMESTAMP
      FOR UPDATE`,
      [id, actor],
    );
    if (!result.rows.length)
      throw new NotFoundException(
        'Preview expired or was not found. Upload the file again.',
      );
    return result.rows[0];
  }

  private async validatedRows(client: PoolClient, id: string) {
    const found = await client.query<{
      row_number: number;
      row_data: NominationStatusValues;
    }>(
      `SELECT row_number, row_data
      FROM public.nomination_status_preview_rows
      WHERE preview_id = $1 ORDER BY row_number`,
      [id],
    );
    return found.rows.map((row) => ({
      rowNumber: row.row_number,
      values: row.row_data,
      issues: validateNominationStatusRow(row.row_data),
    }));
  }

  async preview(
    actor: string,
    id: string,
    filter = 'all',
    pageInput = '1',
  ) {
    if (!['all', 'valid', 'invalid'].includes(filter))
      throw new BadRequestException('Invalid filter.');
    if (!/^[1-9]\d{0,4}$/.test(pageInput))
      throw new BadRequestException('Invalid page.');
    return this.database.transaction(async (client) => {
      const preview = await this.previewLock(client, actor, id);
      const rows = await this.validatedRows(client, id);
      const invalidRows = rows.filter((row) =>
        hasNominationStatusErrors(row.issues),
      ).length;
      const selected = rows.filter(
        (row) =>
          filter === 'all' ||
          (filter === 'invalid'
            ? hasNominationStatusErrors(row.issues)
            : !hasNominationStatusErrors(row.issues)),
      );
      const page = Math.min(
        +pageInput,
        Math.max(1, Math.ceil(selected.length / 25)),
      );
      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::TEXT AS count FROM public.nomination_status_rows',
      );
      return {
        id,
        fileName: preview.file_name,
        totalRows: rows.length,
        validRows: rows.length - invalidRows,
        invalidRows,
        existingRows: +existing.rows[0].count,
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
      throw new BadRequestException('Invalid file row number.');
    const values =
      input === undefined ? undefined : cleanNominationStatusValues(input);
    await this.database.transaction(async (client) => {
      await this.previewLock(client, actor, id);
      if (!values) {
        const count = await client.query<{ count: string }>(
          `SELECT COUNT(*)::TEXT AS count
          FROM public.nomination_status_preview_rows WHERE preview_id = $1`,
          [id],
        );
        if (+count.rows[0].count <= 1)
          throw new ConflictException(
            'The final preview row cannot be deleted. Cancel the preview instead.',
          );
      }
      const result = values
        ? await client.query(
            `UPDATE public.nomination_status_preview_rows
            SET row_data = $3::JSONB
            WHERE preview_id = $1 AND row_number = $2`,
            [id, +rowInput, JSON.stringify(values)],
          )
        : await client.query(
            `DELETE FROM public.nomination_status_preview_rows
            WHERE preview_id = $1 AND row_number = $2`,
            [id, +rowInput],
          );
      if (!result.rowCount)
        throw new NotFoundException('Preview row was not found.');
    });
  }

  async cancel(actor: string, id: string) {
    await this.database.transaction(async (client) => {
      await this.previewLock(client, actor, id);
      await client.query(
        'DELETE FROM public.nomination_status_previews WHERE id = $1',
        [id],
      );
    });
  }

  async commit(actor: string, id: string, confirmed: unknown) {
    if (confirmed !== true)
      throw new BadRequestException(
        'Confirm replacement of every current nomination status row.',
      );
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client);
      const preview = await this.previewLock(client, actor, id);
      if (preview.base_revision !== revision)
        throw new ConflictException(
          'Nomination status data changed after preview. Upload the file again.',
        );
      const rows = await this.validatedRows(client, id);
      if (
        !rows.length ||
        rows.some((row) => hasNominationStatusErrors(row.issues))
      )
        throw new ConflictException(
          'Correct the invalid rows before replacing nomination status data.',
        );
      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::TEXT AS count FROM public.nomination_status_rows',
      );
      const replacedRows = +existing.rows[0].count;
      const imported = await client.query<{ id: string }>(
        `INSERT INTO public.nomination_status_imports
          (file_name, file_hash, row_count, replaced_rows, imported_by)
        VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          preview.file_name,
          preview.file_hash,
          rows.length,
          replacedRows,
          actor,
        ],
      );
      await client.query('DELETE FROM public.nomination_status_rows');
      await client.query(
        `INSERT INTO public.nomination_status_rows
          (${nominationStatusColumns.join(', ')}, import_id, updated_by)
        SELECT value.year::INTEGER, value.corp_plant, value.range,
          value.department, value.employee_no::BIGINT, value.employee_name,
          value.talent_pool, value.result, value.admission, $2, $3
        FROM JSONB_TO_RECORDSET($1::JSONB) AS value(
          ${nominationStatusColumns.map((column) => `${column} TEXT`).join(', ')}
        )`,
        [
          JSON.stringify(rows.map((row) => row.values)),
          imported.rows[0].id,
          actor,
        ],
      );
      await client.query(
        `UPDATE public.nomination_status_state
        SET revision = revision + 1 WHERE singleton = TRUE`,
      );
      await client.query(
        `UPDATE public.nomination_status_previews
        SET status = 'committed' WHERE id = $1`,
        [id],
      );
      return { importedRows: rows.length, replacedRows };
    });
  }
}