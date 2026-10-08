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
  parsePoolFile,
  validatePoolRows,
} from './pool-register.parser';
import {
  columnsFor,
  hasErrors,
  type PoolColumn,
  type PoolFile,
  type PoolKind,
  type PoolValues,
} from './pool-register.types';

type RegisterStorage = {
  table: string;
  personnelColumn: string;
  columns: readonly { key: PoolColumn; databaseColumn: string }[];
};

const registerStorage = {
  development: {
    table: 'public.development_pool_register',
    personnelColumn: 'employee_no',
    columns: [
      { key: 'pers_no', databaseColumn: 'employee_no' },
      { key: 'employee_name', databaseColumn: 'employee_name' },
      { key: 'ps_group', databaseColumn: 'current_group' },
      { key: 'department', databaseColumn: 'department' },
      { key: 'department_feb', databaseColumn: 'department_feb' },
      { key: 'range', databaseColumn: 'range' },
      { key: 'pool', databaseColumn: 'development_pool' },
      { key: 'start_date', databaseColumn: 'pool_start_date' },
      { key: 'end_date', databaseColumn: 'pool_end_date' },
    ],
  },
  talent: {
    table: 'public.talent_pool_register',
    personnelColumn: 'pers_no',
    columns: [
      { key: 'pers_no', databaseColumn: 'pers_no' },
      { key: 'employee_name', databaseColumn: 'employee_name' },
      { key: 'ps_group', databaseColumn: 'current_group' },
      { key: 'department', databaseColumn: 'department' },
      { key: 'range', databaseColumn: 'range' },
      { key: 'pool', databaseColumn: 'talent_pool' },
      { key: 'gender', databaseColumn: 'gender' },
      { key: 'start_date', databaseColumn: 'from_date' },
      { key: 'end_date', databaseColumn: 'to_date' },
      { key: 'active_passive', databaseColumn: 'active_passive' },
    ],
  },
} satisfies Record<PoolKind, RegisterStorage>;

@Injectable()
export class PoolRegisterService {
  constructor(private readonly database: DatabaseService) {}
  kind(value: string): PoolKind {
    if (value !== 'development' && value !== 'talent')
      throw new BadRequestException('Unknown pool type.');
    return value;
  }
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
    const result = await client.query<PoolValues>(
      `SELECT pers_no::TEXT, COALESCE(personnel_number, '') AS employee_name,
      COALESCE(ps_group, '') AS ps_group, COALESCE(organizational_unit, '') AS department,
      COALESCE(range, '') AS range, COALESCE(gender_key, '') AS gender
      FROM public.employee_namelist WHERE pers_no = ANY($1::BIGINT[])`,
      [[...new Set(valid)]],
    );
    return new Map(result.rows.map((row) => [row.pers_no, row]));
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
  async list(kind: PoolKind, actor: string) {
    const storage = registerStorage[kind];
    const projection =
      kind === 'development'
        ? `s.id, s.employee_no::TEXT AS pers_no, s.employee_name,
          s.current_group AS ps_group, s.department, s.department_feb,
          s.range, s.development_pool AS pool, '' AS gender,
          TO_CHAR(s.pool_start_date, 'YYYY-MM-DD') AS start_date,
          TO_CHAR(s.pool_end_date, 'YYYY-MM-DD') AS end_date,
          '' AS active_passive`
        : `s.id, s.pers_no::TEXT, s.employee_name,
          s.current_group AS ps_group, s.department, '' AS department_feb,
          s.range, s.talent_pool AS pool, s.gender,
          TO_CHAR(s.from_date, 'YYYY-MM-DD') AS start_date,
          TO_CHAR(s.to_date, 'YYYY-MM-DD') AS end_date,
          s.active_passive`;
    const result = await this.database.query<PoolValues & { id: string }>(
      `SELECT ${projection}
      FROM ${storage.table} s LEFT JOIN public.employee_namelist e ON e.pers_no = s.${storage.personnelColumn}
      WHERE EXISTS (SELECT 1 FROM public.master_access access WHERE access.account_id = $1::UUID
        AND (access.role IN ('hrbp', 'admin')
          OR (access.role = 'range_head' AND BTRIM(e.range) = BTRIM(access.assigned_range))
          OR (access.role IN ('department_head', 'sub_department_head') AND BTRIM(e.range) = BTRIM(access.assigned_range)
            AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit))))
      ORDER BY s.employee_name, s.${storage.personnelColumn}`,
      [actor],
    );
    return result.rows;
  }
  private async lockState(client: PoolClient, kind: PoolKind) {
    const result = await client.query<{ revision: string }>(
      'SELECT revision::TEXT FROM public.pool_register_state WHERE kind = $1 FOR UPDATE',
      [kind],
    );
    return result.rows[0].revision;
  }
  private async bump(client: PoolClient, kind: PoolKind) {
    await client.query(
      'UPDATE public.pool_register_state SET revision = revision + 1 WHERE kind = $1',
      [kind],
    );
  }
  async save(kind: PoolKind, actor: string, input: unknown, id?: string) {
    if (id) this.uuid(id);
    const values = cleanValues(input, kind);
    const storage = registerStorage[kind];
    return this.database.transaction(async (client) => {
      await this.lockState(client, kind);
      const [row] = validatePoolRows(
        [{ rowNumber: 2, values, issues: [] }],
        kind,
        await this.employees(client, [values.pers_no]),
      );
      if (hasErrors(row.issues))
        throw new BadRequestException({
          message: 'Correct the highlighted values.',
          issues: row.issues,
        });
      const duplicate = await client.query(
        `SELECT 1 FROM ${storage.table}
        WHERE ${storage.personnelColumn} = $1::BIGINT
          AND ($2::UUID IS NULL OR id <> $2::UUID)`,
        [values.pers_no, id ?? null],
      );
      if (duplicate.rowCount)
        throw new ConflictException({
          message: 'This personnel number already exists in this dataset.',
          issues: [
            {
              column: 'pers_no',
              message: 'Duplicate personnel number in this dataset.',
              severity: 'error',
            },
          ],
        });
      const parameters: unknown[] = storage.columns.map(
        ({ key }) => values[key],
      );
      const actorParameter = storage.columns.length + 1;
      let saved: string;
      if (id) {
        const idParameter = actorParameter + 1;
        const result = await client.query<{ id: string }>(
          `UPDATE ${storage.table} SET ${storage.columns.map(({ databaseColumn }, index) => `${databaseColumn} = $${index + 1}`).join(', ')},
          updated_by = $${actorParameter}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${idParameter} RETURNING id`,
          [...parameters, actor, id],
        );
        if (!result.rows.length)
          throw new NotFoundException('Row was not found.');
        saved = result.rows[0].id;
      } else {
        const result = await client.query<{ id: string }>(
          `INSERT INTO ${storage.table}
          (${storage.columns.map(({ databaseColumn }) => databaseColumn).join(', ')}, updated_by)
          VALUES (${storage.columns.map((_, index) => `$${index + 1}`).join(', ')}, $${actorParameter}) RETURNING id`,
          [...parameters, actor],
        );
        saved = result.rows[0].id;
      }
      await this.bump(client, kind);
      return { id: saved, issues: row.issues };
    });
  }
  async remove(kind: PoolKind, id: string) {
    this.uuid(id);
    const storage = registerStorage[kind];
    await this.database.transaction(async (client) => {
      await this.lockState(client, kind);
      const result = await client.query(
        `DELETE FROM ${storage.table} WHERE id = $1`,
        [id],
      );
      if (!result.rowCount)
        throw new NotFoundException('Row was not found.');
      await this.bump(client, kind);
    });
  }
  async upload(kind: PoolKind, actor: string, file?: PoolFile) {
    if (!file) throw new BadRequestException('Choose a pool XLSX workbook.');
    if (file.buffer.length > 50 * 1024 * 1024)
      throw new BadRequestException('File exceeds 50 MB.');
    const rows = await parsePoolFile(file, kind);
    return this.database.transaction(async (client) => {
      const revision = await this.lockState(client, kind);
      const result = await client.query<{ id: string }>(
        `INSERT INTO public.pool_register_previews (kind, base_revision, uploaded_by, file_name, file_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
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
        `INSERT INTO public.pool_register_preview_rows (preview_id, row_number, row_data)
        SELECT $1, r."rowNumber", r.values FROM JSONB_TO_RECORDSET($2::JSONB) AS r("rowNumber" INTEGER, values JSONB)`,
        [id, JSON.stringify(rows)],
      );
      return { id };
    });
  }
  private async previewLock(
    client: PoolClient,
    kind: PoolKind,
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
      `SELECT id, file_name, file_hash, base_revision::TEXT FROM public.pool_register_previews
      WHERE id = $1 AND kind = $2 AND uploaded_by = $3 AND status = 'ready' AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
      [id, kind, actor],
    );
    if (!result.rows.length)
      throw new NotFoundException(
        'Preview expired or was not found. Upload the workbook again.',
      );
    return result.rows[0];
  }
  private async validatedRows(client: PoolClient, kind: PoolKind, id: string) {
    const found = await client.query<{
      row_number: number;
      row_data: PoolValues;
    }>(
      'SELECT row_number, row_data FROM public.pool_register_preview_rows WHERE preview_id = $1 ORDER BY row_number',
      [id],
    );
    const rows = found.rows.map((row) => ({
      rowNumber: row.row_number,
      values: row.row_data,
      issues: [],
    }));
    return validatePoolRows(
      rows,
      kind,
      await this.employees(
        client,
        rows.map((row) => row.values.pers_no),
      ),
    );
  }
  async preview(
    kind: PoolKind,
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
      const rows = await this.validatedRows(client, kind, id);
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
        `SELECT COUNT(*)::TEXT AS count FROM ${registerStorage[kind].table}`,
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
    kind: PoolKind,
    actor: string,
    id: string,
    rowInput: string,
    input?: unknown,
  ) {
    if (!/^[1-9]\d{0,5}$/.test(rowInput))
      throw new BadRequestException('Invalid Excel row number.');
    const values = input === undefined ? undefined : cleanValues(input, kind);
    await this.database.transaction(async (client) => {
      await this.previewLock(client, kind, actor, id);
      if (!values) {
        const count = await client.query<{ count: string }>(
          'SELECT COUNT(*)::TEXT AS count FROM public.pool_register_preview_rows WHERE preview_id = $1',
          [id],
        );
        if (+count.rows[0].count <= 1)
          throw new ConflictException(
            'The final preview row cannot be deleted. Cancel the preview instead.',
          );
      }
      const result = values
        ? await client.query(
            'UPDATE public.pool_register_preview_rows SET row_data = $3::JSONB WHERE preview_id = $1 AND row_number = $2',
            [id, +rowInput, JSON.stringify(values)],
          )
        : await client.query(
            'DELETE FROM public.pool_register_preview_rows WHERE preview_id = $1 AND row_number = $2',
            [id, +rowInput],
          );
      if (!result.rowCount)
        throw new NotFoundException('Preview row was not found.');
    });
  }
  async cancel(kind: PoolKind, actor: string, id: string) {
    await this.database.transaction(async (client) => {
      await this.previewLock(client, kind, actor, id);
      await client.query(
        'DELETE FROM public.pool_register_previews WHERE id = $1',
        [id],
      );
    });
  }
  async commit(kind: PoolKind, actor: string, id: string, confirmed: unknown) {
    if (confirmed !== true)
      throw new BadRequestException(
        'Confirm replacement of all current pool data.',
      );
    return this.database.transaction(async (client) => {
      const storage = registerStorage[kind];
      const revision = await this.lockState(client, kind);
      const preview = await this.previewLock(client, kind, actor, id);
      if (preview.base_revision !== revision)
        throw new ConflictException(
          'This pool data changed after preview. Upload the workbook again before replacing it.',
        );
      const rows = await this.validatedRows(client, kind, id);
      if (!rows.length || rows.some((row) => hasErrors(row.issues)))
        throw new ConflictException(
          'Correct the invalid rows before replacing the current pool data.',
        );
      const existing = await client.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count FROM ${storage.table}`,
      );
      const replacedRows = +existing.rows[0].count;
      const imported = await client.query<{ id: string }>(
        `INSERT INTO public.pool_register_imports (kind,file_name,file_hash,row_count,replaced_rows,imported_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          kind,
          preview.file_name,
          preview.file_hash,
          rows.length,
          replacedRows,
          actor,
        ],
      );
      await client.query(`DELETE FROM ${storage.table}`);
      const previewColumns = columnsFor(kind);
      const insertSql =
        kind === 'development'
          ? `INSERT INTO public.development_pool_register
            (employee_no, employee_name, current_group, department,
              department_feb, range, development_pool, pool_start_date,
              pool_end_date, updated_by, import_id)
            SELECT value.pers_no::BIGINT, value.employee_name, value.ps_group,
              value.department, value.department_feb, value.range, value.pool,
              value.start_date::DATE, value.end_date::DATE, $2, $3
            FROM JSONB_TO_RECORDSET($1::JSONB) AS value(
              ${previewColumns.map((column) => `${column} TEXT`).join(', ')}
            )`
          : `INSERT INTO public.talent_pool_register
            (pers_no, employee_name, current_group, department, range,
              talent_pool, gender, from_date, to_date, active_passive,
              updated_by, import_id)
            SELECT value.pers_no::BIGINT, value.employee_name, value.ps_group,
              value.department, value.range, value.pool, value.gender,
              value.start_date::DATE, value.end_date::DATE,
              value.active_passive, $2, $3
            FROM JSONB_TO_RECORDSET($1::JSONB) AS value(
              ${previewColumns.map((column) => `${column} TEXT`).join(', ')}
            )`;
      await client.query(insertSql, [
        JSON.stringify(rows.map((row) => row.values)),
        actor,
        imported.rows[0].id,
      ]);
      await this.bump(client, kind);
      await client.query(
        "UPDATE public.pool_register_previews SET status = 'committed' WHERE id = $1",
        [id],
      );
      return { importedRows: rows.length, replacedRows };
    });
  }
}
