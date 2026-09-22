import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type {
  RbinMapping,
  RbinMappingInput,
  RbinMappingKind,
  RbinMappingPage,
} from './rbin-mappings.types';

type MappingRow = {
  mapping_id: string;
  organizational_unit: string;
  mapped_value: string;
  source_file_name: string;
  updated_at: Date | string;
};

type MappingConfig = { table: string; valueColumn: string };

function config(kind: RbinMappingKind): MappingConfig {
  return kind === 'ranges'
    ? { table: 'org_unit_range_mappings', valueColumn: 'range_value' }
    : { table: 'org_unit_function_mappings', valueColumn: 'function_value' };
}

function mapRow(row: MappingRow): RbinMapping {
  return {
    id: row.mapping_id,
    organizationalUnit: row.organizational_unit,
    value: row.mapped_value,
    sourceFileName: row.source_file_name,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
  };
}

@Injectable()
export class RbinMappingsRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(
    kind: RbinMappingKind,
    search: string,
    filter: string,
    page: number,
    pageSize: number,
  ): Promise<RbinMappingPage> {
    const { table, valueColumn } = config(kind);
    const predicate = `WHERE ($1::text = '' OR
        STRPOS(LOWER(organizational_unit), LOWER($1)) > 0 OR
        STRPOS(LOWER(${valueColumn}), LOWER($1)) > 0)
      AND ($2::text = '' OR LOWER(BTRIM(${valueColumn})) = LOWER(BTRIM($2)))`;
    const [rows, count, options] = await Promise.all([
      this.database.query<MappingRow>(
        `SELECT mapping_id, organizational_unit, ${valueColumn} AS mapped_value,
           source_file_name, updated_at
         FROM public.${table}
         ${predicate}
         ORDER BY LOWER(organizational_unit), organizational_unit
         LIMIT $3 OFFSET $4`,
        [search, filter, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM public.${table} ${predicate}`,
        [search, filter],
      ),
      this.database.query<{ value: string }>(
        `SELECT DISTINCT BTRIM(${valueColumn}) AS value
         FROM public.${table}
         ORDER BY value`,
      ),
    ]);
    return {
      items: rows.rows.map(mapRow),
      total: Number(count.rows[0]?.count ?? 0),
      page,
      pageSize,
      search,
      filter,
      filterOptions: options.rows.map((option) => option.value),
    };
  }

  async create(kind: RbinMappingKind, input: RbinMappingInput): Promise<RbinMapping | null> {
    const { table, valueColumn } = config(kind);
    const result = await this.database.query<MappingRow>(
      `INSERT INTO public.${table} (organizational_unit, ${valueColumn}, source_file_name)
       VALUES ($1, $2, 'manual')
       ON CONFLICT (LOWER(BTRIM(organizational_unit))) DO NOTHING
       RETURNING mapping_id, organizational_unit, ${valueColumn} AS mapped_value,
         source_file_name, updated_at`,
      [input.organizationalUnit, input.value],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async update(kind: RbinMappingKind, id: string, input: RbinMappingInput): Promise<RbinMapping | null> {
    const { table, valueColumn } = config(kind);
    const result = await this.database.query<MappingRow>(
      `UPDATE public.${table}
       SET organizational_unit = $2, ${valueColumn} = $3,
           source_file_name = 'manual', updated_at = CURRENT_TIMESTAMP
       WHERE mapping_id = $1
       RETURNING mapping_id, organizational_unit, ${valueColumn} AS mapped_value,
         source_file_name, updated_at`,
      [id, input.organizationalUnit, input.value],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async delete(kind: RbinMappingKind, id: string): Promise<boolean> {
    const { table } = config(kind);
    const result = await this.database.query(
      `DELETE FROM public.${table} WHERE mapping_id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}