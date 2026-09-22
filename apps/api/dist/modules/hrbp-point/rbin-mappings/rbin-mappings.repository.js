"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbinMappingsRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../../database/database.service");
function config(kind) {
    return kind === 'ranges'
        ? { table: 'org_unit_range_mappings', valueColumn: 'range_value' }
        : { table: 'org_unit_function_mappings', valueColumn: 'function_value' };
}
function mapRow(row) {
    return {
        id: row.mapping_id,
        organizationalUnit: row.organizational_unit,
        value: row.mapped_value,
        sourceFileName: row.source_file_name,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
    };
}
let RbinMappingsRepository = class RbinMappingsRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list(kind, search, filter, page, pageSize) {
        const { table, valueColumn } = config(kind);
        const predicate = `WHERE ($1::text = '' OR
        STRPOS(LOWER(organizational_unit), LOWER($1)) > 0 OR
        STRPOS(LOWER(${valueColumn}), LOWER($1)) > 0)
      AND ($2::text = '' OR LOWER(BTRIM(${valueColumn})) = LOWER(BTRIM($2)))`;
        const [rows, count, options] = await Promise.all([
            this.database.query(`SELECT mapping_id, organizational_unit, ${valueColumn} AS mapped_value,
           source_file_name, updated_at
         FROM public.${table}
         ${predicate}
         ORDER BY LOWER(organizational_unit), organizational_unit
         LIMIT $3 OFFSET $4`, [search, filter, pageSize, (page - 1) * pageSize]),
            this.database.query(`SELECT COUNT(*)::text AS count FROM public.${table} ${predicate}`, [search, filter]),
            this.database.query(`SELECT DISTINCT BTRIM(${valueColumn}) AS value
         FROM public.${table}
         ORDER BY value`),
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
    async create(kind, input) {
        const { table, valueColumn } = config(kind);
        const result = await this.database.query(`INSERT INTO public.${table} (organizational_unit, ${valueColumn}, source_file_name)
       VALUES ($1, $2, 'manual')
       ON CONFLICT (LOWER(BTRIM(organizational_unit))) DO NOTHING
       RETURNING mapping_id, organizational_unit, ${valueColumn} AS mapped_value,
         source_file_name, updated_at`, [input.organizationalUnit, input.value]);
        return result.rows[0] ? mapRow(result.rows[0]) : null;
    }
    async update(kind, id, input) {
        const { table, valueColumn } = config(kind);
        const result = await this.database.query(`UPDATE public.${table}
       SET organizational_unit = $2, ${valueColumn} = $3,
           source_file_name = 'manual', updated_at = CURRENT_TIMESTAMP
       WHERE mapping_id = $1
       RETURNING mapping_id, organizational_unit, ${valueColumn} AS mapped_value,
         source_file_name, updated_at`, [id, input.organizationalUnit, input.value]);
        return result.rows[0] ? mapRow(result.rows[0]) : null;
    }
    async delete(kind, id) {
        const { table } = config(kind);
        const result = await this.database.query(`DELETE FROM public.${table} WHERE mapping_id = $1`, [id]);
        return (result.rowCount ?? 0) > 0;
    }
};
exports.RbinMappingsRepository = RbinMappingsRepository;
exports.RbinMappingsRepository = RbinMappingsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], RbinMappingsRepository);
//# sourceMappingURL=rbin-mappings.repository.js.map