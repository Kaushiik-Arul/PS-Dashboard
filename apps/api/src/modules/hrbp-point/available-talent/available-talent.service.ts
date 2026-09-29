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
  cleanValues,
  parseAvailableFile,
  validateAvailableRows,
} from './available-talent.parser';
import {
  hasErrors,
  availableColumns,
  type AvailableFile,
  type AvailableKind,
  type AvailableValues,
} from './available-talent.types';

@Injectable()
export class AvailableTalentService {
  constructor(private readonly database: DatabaseService) {}
  private uuid(id: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new BadRequestException('Invalid record ID.');
  }
  private async employees(client: PoolClient, numbers: string[]) {
    const valid = numbers.filter(
      (value) =>
        /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n,
    );
    const result = await client.query<AvailableValues>(
      `SELECT pers_no::TEXT, COALESCE(personnel_number, '') AS employee_name,
      COALESCE(lp, '') AS entity, COALESCE(organizational_unit, '') AS department,
      COALESCE(hrbp2_global_id, '') AS hrbp
      FROM public.employee_namelist WHERE pers_no = ANY($1::BIGINT[])`,
      [[...new Set(valid)]],
    );
    return new Map(result.rows.map((row) => [row.pers_no, row]));
  }
  private async knownJds(client: PoolClient, ids: string[]) {
    const result = await client.query<{ jd_id: string }>(
      'SELECT LOWER(jd_id) AS jd_id FROM public.job_descriptions WHERE LOWER(jd_id) = ANY($1::TEXT[])',
      [[...new Set(ids.filter(Boolean).map((id) => id.toLowerCase()))]],
    );
    return new Set(result.rows.map((row) => row.jd_id));
  }
  async lookup(persNo: string) {
    if (
      !/^[1-9]\d{0,18}$/.test(persNo) ||
      BigInt(persNo) > 9223372036854775807n
    )
      throw new BadRequestException('Enter a valid personnel number.');
    return this.database.transaction(async (client) => ({
      employee: (await this.employees(client, [persNo])).get(persNo) ?? null,
    }));
  }
  async list(kind: AvailableKind, actor: string) {
    const result = await this.database.query<AvailableValues & { id: string }>(
      `SELECT s.id, s.pers_no::TEXT, s.employee_name, s.entity, s.department,
      s.hrbp, s.preferences, s.current_status, s.comments, s.jd_id
      FROM public.available_talent_rows s LEFT JOIN public.employee_namelist e ON e.pers_no = s.pers_no
      WHERE s.kind = $1 AND EXISTS (SELECT 1 FROM public.master_access access WHERE access.account_id = $2::UUID
        AND (access.role IN ('hrbp', 'admin')
          OR (access.role = 'range_head' AND BTRIM(e.range) = BTRIM(access.assigned_range))
          OR (access.role IN ('department_head', 'sub_department_head') AND BTRIM(e.range) = BTRIM(access.assigned_range)
            AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit))))
      ORDER BY s.employee_name, s.pers_no`,
      [kind, actor],
    );
    return result.rows;
  }
  private async lockState(client: PoolClient, kind: AvailableKind) {
    const result = await client.query<{ revision: string }>(
      'SELECT revision::TEXT FROM public.available_talent_state WHERE kind = $1 FOR UPDATE',
      [kind],
    );
    return result.rows[0].revision;
  }
  private async bump(client: PoolClient, kind: AvailableKind) {
    await client.query(
      'UPDATE public.available_talent_state SET revision = revision + 1 WHERE kind = $1',
      [kind],
    );
  }
  async save(kind: AvailableKind, actor: string, input: unknown, id?: string) {
    if (id) this.uuid(id);
    const values = cleanValues(input);
    return this.database.transaction(async (client) => {
      await this.lockState(client, kind);
      const [row] = validateAvailableRows(
        [{ rowNumber: 2, values, issues: [] }],
        await this.employees(client, [values.pers_no]),
        await this.knownJds(client, [values.jd_id]),
      );
      if (hasErrors(row.issues))
        throw new BadRequestException({
          message: 'Correct the highlighted values.',
          issues: row.issues,
        });
      const duplicate = await client.query(
        'SELECT 1 FROM public.available_talent_rows WHERE kind = $1 AND pers_no = $2::BIGINT AND ($3::UUID IS NULL OR id <> $3::UUID)',
        [kind, values.pers_no, id ?? null],
      );
      if (duplicate.rowCount)
        throw new ConflictException({
          message: 'This personnel number already exists in this register.',
          issues: [
            {
              column: 'pers_no',
              message: 'Duplicate personnel number in this register.',
              severity: 'error',
            },
          ],
        });
      const parameters: unknown[] = availableColumns.map((key) => values[key]);
      let saved: string;
      if (id) {
        const result = await client.query<{ id: string }>(
          `UPDATE public.available_talent_rows SET ${availableColumns.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_by = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 AND kind = $12 RETURNING id`,
          [...parameters, actor, id, kind],
        );
        if (!result.rows.length)
          throw new NotFoundException('Register row was not found.');
        saved = result.rows[0].id;
      } else {
        const result = await client.query<{ id: string }>(
          `INSERT INTO public.available_talent_rows (${availableColumns.join(', ')}, updated_by, kind) VALUES (${availableColumns.map((_, i) => `$${i + 1}`).join(', ')}, $10, $11) RETURNING id`,
          [...parameters, actor, kind],
        );
        saved = result.rows[0].id;
      }
      await this.bump(client, kind);
      return { id: saved, issues: row.issues };
    });
  }
  async remove(kind: AvailableKind, id: string) {
    this.uuid(id);
    await this.database.transaction(async (client) => {
      await this.lockState(client, kind);
      const result = await client.query(
        'DELETE FROM public.available_talent_rows WHERE id = $1 AND kind = $2',
        [id, kind],
      );
      if (!result.rowCount)
        throw new NotFoundException('Register row was not found.');
      await this.bump(client, kind);
    });
  }
  async upload(kind: AvailableKind, actor: string, file?: AvailableFile) {
    if (!file)
      throw new BadRequestException(
        'Choose a STEP-Available Talent XLSX workbook.',
      );
    if (file.buffer.length > 50 * 1024 * 1024)
      throw new BadRequestException('File exceeds 50 MB.');
    const rows = await parseAvailableFile(file);
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client, kind);
      const result = await client.query<{ id: string }>(
        `INSERT INTO public.available_talent_previews (kind, base_revision, uploaded_by, file_name, file_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [
          kind,
          revision,
          actor,
          file.originalname,
          createHash('sha256').update(file.buffer).digest('hex'),
        ],
      );
      const id = result.rows[0].id;
      await client.query(
        `INSERT INTO public.available_talent_preview_rows (preview_id, row_number, row_data)
        SELECT $1, r."rowNumber", r.values FROM JSONB_TO_RECORDSET($2::JSONB) AS r("rowNumber" INTEGER, values JSONB)`,
        [id, JSON.stringify(rows)],
      );
      return { id };
    });
  }
  private async previewLock(
    client: PoolClient,
    kind: AvailableKind,
    actor: string,
    id: string,
  ) {
    this.uuid(id);
    const result = await client.query<{
      id: string;
      file_name: string;
      file_hash: string;
      base_revision: string;
    }>(
      `SELECT id, file_name, file_hash, base_revision::TEXT FROM public.available_talent_previews
      WHERE id = $1 AND kind = $2 AND uploaded_by = $3 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
      [id, kind, actor],
    );
    if (!result.rows.length)
      throw new NotFoundException(
        'Preview expired or was not found. Upload the workbook again.',
      );
    return result.rows[0];
  }
  private async validatedRows(client: PoolClient, id: string) {
    const found = await client.query<{
      row_number: number;
      row_data: AvailableValues;
    }>(
      'SELECT row_number, row_data FROM public.available_talent_preview_rows WHERE preview_id = $1 ORDER BY row_number',
      [id],
    );
    const rows = found.rows.map((row) => ({
      rowNumber: row.row_number,
      values: row.row_data,
      issues: [],
    }));
    return validateAvailableRows(
      rows,
      await this.employees(
        client,
        rows.map((row) => row.values.pers_no),
      ),
      await this.knownJds(
        client,
        rows.map((row) => row.values.jd_id),
      ),
    );
  }
  async preview(
    kind: AvailableKind,
    actor: string,
    id: string,
    filter = 'all',
    pageInput = '1',
  ) {
    if (!['all', 'valid', 'warning', 'invalid'].includes(filter))
      throw new BadRequestException('Invalid filter.');
    if (!/^[1-9]\d{0,4}$/.test(pageInput))
      throw new BadRequestException('Invalid page.');
    return this.database.transaction(async (client) => {
      const preview = await this.previewLock(client, kind, actor, id);
      const rows = await this.validatedRows(client, id);
      const invalid = rows.filter((row) => hasErrors(row.issues)).length;
      const warnings = rows.filter(
        (row) => !hasErrors(row.issues) && row.issues.length > 0,
      ).length;
      const selected = rows.filter(
        (row) =>
          filter === 'all' ||
          (filter === 'invalid'
            ? hasErrors(row.issues)
            : filter === 'warning'
              ? !hasErrors(row.issues) && row.issues.length > 0
              : !row.issues.length),
      );
      const page = Math.min(
        +pageInput,
        Math.max(1, Math.ceil(selected.length / 25)),
      );
      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::TEXT AS count FROM public.available_talent_rows WHERE kind = $1',
        [kind],
      );
      return {
        id,
        fileName: preview.file_name,
        totalRows: rows.length,
        validRows: rows.length - invalid - warnings,
        warningRows: warnings,
        invalidRows: invalid,
        existingRows: +existing.rows[0].count,
        filteredRows: selected.length,
        page,
        rows: selected.slice((page - 1) * 25, page * 25),
      };
    });
  }
  async editPreview(
    kind: AvailableKind,
    actor: string,
    id: string,
    rowInput: string,
    input?: unknown,
  ) {
    if (!/^[1-9]\d{0,5}$/.test(rowInput))
      throw new BadRequestException('Invalid Excel row number.');
    const values = input === undefined ? undefined : cleanValues(input);
    await this.database.transaction(async (client) => {
      await this.previewLock(client, kind, actor, id);
      if (!values) {
        const count = await client.query<{ count: string }>(
          'SELECT COUNT(*)::TEXT AS count FROM public.available_talent_preview_rows WHERE preview_id = $1',
          [id],
        );
        if (+count.rows[0].count <= 1)
          throw new ConflictException(
            'The final preview row cannot be deleted. Cancel the preview instead.',
          );
      }
      const result = values
        ? await client.query(
            'UPDATE public.available_talent_preview_rows SET row_data = $3::JSONB WHERE preview_id = $1 AND row_number = $2',
            [id, +rowInput, JSON.stringify(values)],
          )
        : await client.query(
            'DELETE FROM public.available_talent_preview_rows WHERE preview_id = $1 AND row_number = $2',
            [id, +rowInput],
          );
      if (!result.rowCount)
        throw new NotFoundException('Preview row was not found.');
    });
  }
  async cancel(kind: AvailableKind, actor: string, id: string) {
    await this.database.transaction(async (client) => {
      await this.previewLock(client, kind, actor, id);
      await client.query(
        'DELETE FROM public.available_talent_previews WHERE id = $1',
        [id],
      );
    });
  }
  async commit(
    kind: AvailableKind,
    actor: string,
    id: string,
    confirmed: unknown,
  ) {
    if (confirmed !== true)
      throw new BadRequestException(
        'Confirm replacement of every current row in this register.',
      );
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client, kind);
      const preview = await this.previewLock(client, kind, actor, id);
      if (preview.base_revision !== revision)
        throw new ConflictException(
          'This register changed after preview. Upload the workbook again before replacing it.',
        );
      const rows = await this.validatedRows(client, id);
      if (!rows.length || rows.some((row) => hasErrors(row.issues)))
        throw new ConflictException(
          'Correct the invalid rows before replacing this register.',
        );
      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::TEXT AS count FROM public.available_talent_rows WHERE kind = $1',
        [kind],
      );
      const replacedRows = +existing.rows[0].count;
      const imported = await client.query<{ id: string }>(
        `INSERT INTO public.available_talent_imports (kind,file_name,file_hash,row_count,replaced_rows,imported_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          kind,
          preview.file_name,
          preview.file_hash,
          rows.length,
          replacedRows,
          actor,
        ],
      );
      await client.query(
        'DELETE FROM public.available_talent_rows WHERE kind = $1',
        [kind],
      );
      await client.query(
        `INSERT INTO public.available_talent_rows (${availableColumns.join(', ')}, kind, updated_by, import_id)
        SELECT v.pers_no::BIGINT, v.employee_name, v.entity, v.department, v.hrbp, v.preferences, v.current_status, v.comments, v.jd_id, $2, $3, $4
        FROM JSONB_TO_RECORDSET($1::JSONB) AS v(${availableColumns.map((key) => `${key} TEXT`).join(', ')})`,
        [
          JSON.stringify(rows.map((row) => row.values)),
          kind,
          actor,
          imported.rows[0].id,
        ],
      );
      await this.bump(client, kind);
      await client.query(
        "UPDATE public.available_talent_previews SET status = 'committed' WHERE id = $1",
        [id],
      );
      return { importedRows: rows.length, replacedRows };
    });
  }
}
