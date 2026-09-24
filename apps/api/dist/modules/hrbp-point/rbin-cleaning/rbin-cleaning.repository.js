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
exports.RbinCleaningRepository = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../../database/database.service");
const rbin_cleaning_transformer_1 = require("./rbin-cleaning.transformer");
const reviewColumns = [
    'pers_no', 'personnel_number', 'employee_group', 'ps_group',
    'organizational_unit', 'range', 'function', 'location', 'direct_or_indirect',
];
function isoTimestamp(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return null;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
function validBigInt(value) {
    if (!/^[1-9]\d*$/.test(value))
        return null;
    try {
        const parsed = BigInt(value);
        return parsed <= 9223372036854775807n ? value : null;
    }
    catch {
        return null;
    }
}
function rawPayload(row) {
    const values = row.values;
    return {
        source_row_number: row.rowNumber,
        raw_source_data: values,
        ...values,
        pers_no: validBigInt(values.pers_no),
        global_id: validBigInt(values.global_id),
        hrbp_global_id: validBigInt(values.hrbp_global_id),
        joining_date: validDate(values.joining_date),
        birth_date: validDate(values.birth_date),
        entry_for_retirement: validDate(values.entry_for_retirement),
        technical_entry_date: validDate(values.technical_entry_date),
    };
}
function stagedPayload(row) {
    return {
        source_row_number: row.rowNumber,
        original_data: row.originalValues,
        current_data: row.values,
        validation_issues: row.issues,
        is_valid: row.issues.length === 0,
        range_source: row.rangeSource,
        function_source: row.functionSource,
        comparison_status: row.comparisonStatus,
        baseline_employee_data: row.baselineValues,
        changed_columns: row.changedColumns,
    };
}
let RbinCleaningRepository = class RbinCleaningRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getMappings() {
        const [ranges, functions] = await Promise.all([
            this.database.query(`SELECT organizational_unit, range_value FROM public.org_unit_range_mappings`),
            this.database.query(`SELECT organizational_unit, function_value FROM public.org_unit_function_mappings`),
        ]);
        return {
            ranges: new Map(ranges.rows.map((row) => [(0, rbin_cleaning_transformer_1.normalizeLookupKey)(row.organizational_unit), row.range_value.trim()])),
            functions: new Map(functions.rows.map((row) => [(0, rbin_cleaning_transformer_1.normalizeLookupKey)(row.organizational_unit), row.function_value.trim()])),
        };
    }
    async getBaselines(persNos) {
        if (!persNos.length)
            return new Map();
        const result = await this.database.query(`SELECT employee.pers_no::text AS pers_no,
         JSONB_BUILD_OBJECT(
           'pers_no', employee.pers_no::text,
           'personnel_number', COALESCE(employee.personnel_number, ''),
           'employee_group', COALESCE(employee.employee_group, ''),
           'lp', COALESCE(employee.lp, ''),
           'esgrp', COALESCE(employee.esgrp, ''),
           'employee_subgroup', COALESCE(employee.employee_subgroup, ''),
           'ps_group', COALESCE(employee.ps_group, ''),
           'organizational_unit', COALESCE(employee.organizational_unit, ''),
           'range', COALESCE(employee.range, ''),
           'function', COALESCE(employee.function, ''),
           'organisational_area_pa', COALESCE(employee.organisational_area_pa, ''),
           'gender_key', COALESCE(employee.gender_key, ''),
           'location', COALESCE(employee.location, ''),
           'pa', COALESCE(employee.pa, ''),
           'personnel_area', COALESCE(employee.personnel_area, ''),
           'psubarea', COALESCE(employee.psubarea, ''),
           'personnel_subarea', COALESCE(employee.personnel_subarea, ''),
           'nt_id', COALESCE(employee.nt_id, ''),
           'global_id', COALESCE(employee.global_id::text, ''),
           'cost_center', COALESCE(employee.cost_center, ''),
           'birth_date', COALESCE(TO_CHAR(employee.birth_date, 'YYYY-MM-DD'), ''),
           'joining_date', COALESCE(TO_CHAR(employee.joining_date, 'YYYY-MM-DD'), ''),
           'entry_for_retirement', COALESCE(TO_CHAR(employee.entry_for_retirement, 'YYYY-MM-DD'), ''),
           'designation_text', COALESCE(employee.designation_text, ''),
           'hrbp_global_id', COALESCE(employee.hrbp_global_id::text, ''),
           'hrbp2_global_id', COALESCE(employee.hrbp2_global_id, ''),
           'official_email', COALESCE(employee.official_email, ''),
           'technical_entry_date', COALESCE(TO_CHAR(employee.technical_entry_date, 'YYYY-MM-DD'), ''),
           'direct_or_indirect', COALESCE(employee.direct_or_indirect, '')
         ) AS row_data
       FROM public.employee_namelist employee
       WHERE employee.pers_no = ANY($1::bigint[])`, [persNos]);
        return new Map(result.rows.map((row) => [row.pers_no, row.row_data]));
    }
    async getExceptions(persNos) {
        if (!persNos.length)
            return new Map();
        const result = await this.database.query(`SELECT pers_no::text AS pers_no, column_name, fixed_value
       FROM public.rbin_employee_column_exceptions
       WHERE pers_no = ANY($1::bigint[])`, [persNos]);
        const exceptions = new Map();
        result.rows.forEach((row) => {
            const employeeRules = exceptions.get(row.pers_no) ?? new Map();
            employeeRules.set(row.column_name, row.fixed_value.trim());
            exceptions.set(row.pers_no, employeeRules);
        });
        return exceptions;
    }
    async createBatch(actorAccountId, file, rawRows, stagedRows) {
        const fileHash = (0, node_crypto_1.createHash)('sha256').update(file.buffer).digest('hex');
        const validRows = stagedRows.filter((row) => row.issues.length === 0).length;
        const countComparison = (status) => stagedRows.filter((row) => row.comparisonStatus === status).length;
        return this.database.transaction(async (client) => {
            const audit = await client.query(`INSERT INTO public.rbin_namelist_imports (
           reporting_month, uploaded_by, file_name, file_hash, status
         ) VALUES (DATE_TRUNC('month', CURRENT_DATE)::date, $1, $2, $3, 'processing')
         RETURNING id::text`, [actorAccountId, file.originalname, fileHash]);
            const importId = audit.rows[0].id;
            await client.query(`DELETE FROM public.rbin_namelist`);
            for (let offset = 0; offset < rawRows.length; offset += 500) {
                await client.query(`INSERT INTO public.rbin_namelist (
             import_id, source_row_number, raw_source_data, pers_no, personnel_number,
             joining_date, pa, personnel_area, employee_group, esgrp, employee_subgroup,
             psubarea, personnel_subarea, lp, cost_center, organizational_unit, location,
             organisational_area_pa, gender_key, global_id, ps_group, birth_date, nt_id,
             designation_text, other_designation, entry_for_retirement, technical_entry_date,
             official_email, direct_or_indirect, hrbp_global_id, hrbp2_global_id
           ) SELECT $1, item.source_row_number, item.raw_source_data, item.pers_no,
             item.personnel_number, item.joining_date, item.pa, item.personnel_area,
             item.employee_group, item.esgrp, item.employee_subgroup, item.psubarea,
             item.personnel_subarea, item.lp, item.cost_center, item.organizational_unit,
             item.location, item.organisational_area_pa, item.gender_key, item.global_id,
             item.ps_group, item.birth_date, item.nt_id, item.designation_text,
             item.other_designation, item.entry_for_retirement, item.technical_entry_date,
             item.official_email, item.direct_or_indirect, item.hrbp_global_id,
             item.hrbp2_global_id
           FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             source_row_number integer, raw_source_data jsonb, pers_no bigint,
             personnel_number text, joining_date date, pa text, personnel_area text,
             employee_group text, esgrp text, employee_subgroup text, psubarea text,
             personnel_subarea text, lp text, cost_center text, organizational_unit text,
             location text, organisational_area_pa text, gender_key text, global_id bigint,
             ps_group text, birth_date date, nt_id text, designation_text text,
             other_designation text, entry_for_retirement date, technical_entry_date date,
             official_email text, direct_or_indirect text, hrbp_global_id bigint,
             hrbp2_global_id text
           )`, [importId, JSON.stringify(rawRows.slice(offset, offset + 500).map(rawPayload))]);
            }
            const batch = await client.query(`INSERT INTO public.rbin_staging_batches (
           import_id, uploaded_by, file_name, file_hash, total_raw_rows, staged_rows,
           excluded_rows, valid_rows, invalid_rows, new_rows, changed_rows, unchanged_rows
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING batch_id`, [
                importId, actorAccountId, file.originalname, fileHash, rawRows.length,
                stagedRows.length, rawRows.length - stagedRows.length, validRows,
                stagedRows.length - validRows, countComparison('new'), countComparison('changed'),
                countComparison('unchanged'),
            ]);
            const batchId = batch.rows[0].batch_id;
            for (let offset = 0; offset < stagedRows.length; offset += 500) {
                await client.query(`INSERT INTO public.rbin_staging_rows (
             batch_id, source_row_number, original_data, current_data, validation_issues,
             is_valid, range_source, function_source, comparison_status,
             baseline_employee_data, changed_columns
           ) SELECT $1, item.source_row_number, item.original_data, item.current_data,
             item.validation_issues, item.is_valid, item.range_source, item.function_source,
             item.comparison_status, item.baseline_employee_data, item.changed_columns
           FROM JSONB_TO_RECORDSET($2::jsonb) AS item(
             source_row_number integer, original_data jsonb, current_data jsonb,
             validation_issues jsonb, is_valid boolean, range_source text,
             function_source text, comparison_status text, baseline_employee_data jsonb,
             changed_columns text[]
           )`, [batchId, JSON.stringify(stagedRows.slice(offset, offset + 500).map(stagedPayload))]);
            }
            await client.query(`UPDATE public.rbin_namelist_imports
         SET total_rows = $2, ps_rows = $3, excluded_rows = $4, valid_rows = $5,
             invalid_rows = $6, status = 'ready', completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [
                importId, rawRows.length, stagedRows.length, rawRows.length - stagedRows.length,
                validRows, stagedRows.length - validRows,
            ]);
            return batchId;
        });
    }
    async listBatches(actorAccountId) {
        const result = await this.database.query(`${this.summarySelect()} WHERE batch.uploaded_by = $1 ORDER BY batch.created_at DESC`, [actorAccountId]);
        return Promise.all(result.rows.map(async (record) => this.mapSummary(record, await this.getMappingAlerts(record.batch_id))));
    }
    async getSummary(batchId, actorAccountId) {
        const result = await this.database.query(`${this.summarySelect()} WHERE batch.batch_id = $1 AND batch.uploaded_by = $2`, [batchId, actorAccountId]);
        const record = result.rows[0];
        return record ? this.mapSummary(record, await this.getMappingAlerts(batchId)) : null;
    }
    async getRows(batchId, actorAccountId, filter, page, pageSize, search, view) {
        const summary = await this.getSummary(batchId, actorAccountId);
        if (!summary)
            return null;
        const rowConditions = [];
        const countConditions = [];
        const values = [batchId, pageSize, (page - 1) * pageSize];
        const countValues = [batchId, actorAccountId];
        if (filter === 'valid' || filter === 'invalid') {
            rowConditions.push(`AND is_valid = ${filter === 'valid' ? 'TRUE' : 'FALSE'}`);
            countConditions.push(`AND row.is_valid = ${filter === 'valid' ? 'TRUE' : 'FALSE'}`);
        }
        else if (filter !== 'all') {
            values.push(filter);
            countValues.push(filter);
            rowConditions.push(`AND comparison_status = $${values.length}`);
            countConditions.push(`AND row.comparison_status = $${countValues.length}`);
            if (filter === 'changed' && view === 'key') {
                values.push(reviewColumns);
                countValues.push(reviewColumns);
                rowConditions.push(`AND changed_columns && $${values.length}::text[]`);
                countConditions.push(`AND row.changed_columns && $${countValues.length}::text[]`);
            }
        }
        if (search) {
            values.push(search);
            countValues.push(search);
            rowConditions.push(`AND (
        STRPOS(LOWER(COALESCE(current_data->>'pers_no', '')), LOWER($${values.length}::text)) > 0
        OR STRPOS(LOWER(COALESCE(current_data->>'personnel_number', '')), LOWER($${values.length}::text)) > 0
      )`);
            countConditions.push(`AND (
        STRPOS(LOWER(COALESCE(row.current_data->>'pers_no', '')), LOWER($${countValues.length}::text)) > 0
        OR STRPOS(LOWER(COALESCE(row.current_data->>'personnel_number', '')), LOWER($${countValues.length}::text)) > 0
      )`);
        }
        const [rows, count] = await Promise.all([
            this.database.query(`SELECT source_row_number, original_data, current_data, validation_issues,
           comparison_status, baseline_employee_data, changed_columns, range_source,
           function_source
         FROM public.rbin_staging_rows
         WHERE batch_id = $1 ${rowConditions.join(' ')}
         ORDER BY source_row_number LIMIT $2 OFFSET $3`, values),
            this.database.query(`SELECT COUNT(*)::text AS count
         FROM public.rbin_staging_rows row
         WHERE row.batch_id = $1
           AND EXISTS (
             SELECT 1 FROM public.rbin_staging_batches batch
             WHERE batch.batch_id = row.batch_id AND batch.uploaded_by = $2
           ) ${countConditions.join(' ')}`, countValues),
        ]);
        return {
            ...summary,
            rows: rows.rows.map(this.mapStoredRow),
            filter,
            search,
            page,
            pageSize,
            filteredRows: Number(count.rows[0]?.count ?? 0),
        };
    }
    async getAllRows(batchId, actorAccountId) {
        if (!(await this.getSummary(batchId, actorAccountId)))
            return null;
        const result = await this.database.query(`SELECT source_row_number, original_data, current_data, validation_issues,
         comparison_status, baseline_employee_data, changed_columns, range_source,
         function_source
       FROM public.rbin_staging_rows WHERE batch_id = $1 ORDER BY source_row_number`, [batchId]);
        return result.rows.map(this.mapStoredRow);
    }
    async updateRows(batchId, actorAccountId, rows) {
        await this.database.transaction(async (client) => {
            const batch = await client.query(`SELECT 1 FROM public.rbin_staging_batches
         WHERE batch_id = $1 AND uploaded_by = $2 AND status = 'draft' FOR UPDATE`, [batchId, actorAccountId]);
            if (!batch.rowCount)
                throw new Error('BATCH_NOT_EDITABLE');
            for (let offset = 0; offset < rows.length; offset += 500) {
                await client.query(`UPDATE public.rbin_staging_rows target
           SET current_data = source.current_data,
               validation_issues = source.validation_issues,
               is_valid = source.is_valid,
               range_source = source.range_source,
               function_source = source.function_source,
               comparison_status = source.comparison_status,
               baseline_employee_data = source.baseline_employee_data,
               changed_columns = source.changed_columns,
               updated_at = CURRENT_TIMESTAMP
           FROM JSONB_TO_RECORDSET($2::jsonb) AS source(
             source_row_number integer, current_data jsonb, validation_issues jsonb,
             is_valid boolean, range_source text, function_source text,
             comparison_status text, baseline_employee_data jsonb, changed_columns text[]
           )
           WHERE target.batch_id = $1 AND target.source_row_number = source.source_row_number`, [batchId, JSON.stringify(rows.slice(offset, offset + 500).map(stagedPayload))]);
            }
            await client.query(`UPDATE public.rbin_staging_batches batch SET
           valid_rows = stats.valid_rows,
           invalid_rows = batch.staged_rows - stats.valid_rows,
           new_rows = stats.new_rows,
           changed_rows = stats.changed_rows,
           unchanged_rows = stats.unchanged_rows,
           updated_at = CURRENT_TIMESTAMP
         FROM (
           SELECT COUNT(*) FILTER (WHERE is_valid)::integer AS valid_rows,
             COUNT(*) FILTER (WHERE comparison_status = 'new')::integer AS new_rows,
             COUNT(*) FILTER (WHERE comparison_status = 'changed')::integer AS changed_rows,
             COUNT(*) FILTER (WHERE comparison_status = 'unchanged')::integer AS unchanged_rows
           FROM public.rbin_staging_rows WHERE batch_id = $1
         ) stats WHERE batch.batch_id = $1`, [batchId]);
        });
    }
    async finalize(batchId, actorAccountId) {
        await this.database.transaction(async (client) => {
            const result = await client.query(`SELECT invalid_rows FROM public.rbin_staging_batches
         WHERE batch_id = $1 AND uploaded_by = $2 AND status = 'draft' FOR UPDATE`, [batchId, actorAccountId]);
            if (!result.rows[0])
                throw new Error('BATCH_NOT_EDITABLE');
            if (result.rows[0].invalid_rows > 0)
                throw new Error('INVALID_ROWS');
            await client.query(`UPDATE public.rbin_staging_batches
         SET status = 'ready_for_export', finalized_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP WHERE batch_id = $1`, [batchId]);
        });
    }
    async getExportRows(batchId, actorAccountId) {
        const batch = await this.database.query(`SELECT 1 FROM public.rbin_staging_batches
       WHERE batch_id = $1 AND uploaded_by = $2 AND status IN ('ready_for_export', 'exported')`, [batchId, actorAccountId]);
        if (!batch.rowCount)
            return null;
        const rows = await this.database.query(`SELECT current_data FROM public.rbin_staging_rows
       WHERE batch_id = $1 ORDER BY source_row_number`, [batchId]);
        return rows.rows.map((row) => row.current_data);
    }
    async recordExport(batchId, actorAccountId, fileName, rowCount, buffer) {
        await this.database.transaction(async (client) => {
            const batch = await client.query(`SELECT 1 FROM public.rbin_staging_batches
         WHERE batch_id = $1 AND uploaded_by = $2
           AND status IN ('ready_for_export', 'exported') FOR UPDATE`, [batchId, actorAccountId]);
            if (!batch.rowCount)
                throw new Error('BATCH_NOT_EXPORTABLE');
            await client.query(`INSERT INTO public.rbin_staging_exports (
           batch_id, exported_by, file_name, row_count, file_hash
         ) VALUES ($1, $2, $3, $4, $5)`, [batchId, actorAccountId, fileName, rowCount, (0, node_crypto_1.createHash)('sha256').update(buffer).digest('hex')]);
            await client.query(`UPDATE public.rbin_staging_batches
         SET status = 'exported', first_exported_at = COALESCE(first_exported_at, CURRENT_TIMESTAMP),
             last_exported_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = $1`, [batchId]);
        });
    }
    summarySelect() {
        return `SELECT batch_id, file_name, status, total_raw_rows, staged_rows,
      excluded_rows, valid_rows, invalid_rows, new_rows, changed_rows,
      unchanged_rows, created_at, first_exported_at, last_exported_at
      FROM public.rbin_staging_batches batch`;
    }
    async getMappingAlerts(batchId) {
        const result = await this.database.query(`SELECT current_data->>'organizational_unit' AS organizational_unit,
         COUNT(*)::text AS row_count,
         BOOL_OR(validation_issues @> '[{"column":"range","code":"mapping_not_found"}]'::jsonb) AS missing_range,
         BOOL_OR(validation_issues @> '[{"column":"function","code":"mapping_not_found"}]'::jsonb) AS missing_function
       FROM public.rbin_staging_rows
       WHERE batch_id = $1
         AND (validation_issues @> '[{"code":"mapping_not_found"}]'::jsonb)
       GROUP BY current_data->>'organizational_unit'
       ORDER BY current_data->>'organizational_unit'`, [batchId]);
        return result.rows.map((row) => ({
            organizationalUnit: row.organizational_unit,
            rowCount: Number(row.row_count),
            missingRange: row.missing_range,
            missingFunction: row.missing_function,
        }));
    }
    mapSummary(record, mappingAlerts) {
        return {
            id: record.batch_id,
            fileName: record.file_name,
            createdAt: isoTimestamp(record.created_at),
            status: record.status,
            totalRawRows: record.total_raw_rows,
            stagedRows: record.staged_rows,
            excludedRows: record.excluded_rows,
            validRows: record.valid_rows,
            invalidRows: record.invalid_rows,
            newRows: record.new_rows,
            changedRows: record.changed_rows,
            unchangedRows: record.unchanged_rows,
            mappingAlerts,
            firstExportedAt: isoTimestamp(record.first_exported_at),
            lastExportedAt: isoTimestamp(record.last_exported_at),
        };
    }
    mapStoredRow = (record) => ({
        rowNumber: record.source_row_number,
        originalValues: record.original_data,
        values: record.current_data,
        issues: record.validation_issues,
        comparisonStatus: record.comparison_status,
        baselineValues: record.baseline_employee_data,
        changedColumns: record.changed_columns,
        rangeSource: record.range_source,
        functionSource: record.function_source,
    });
};
exports.RbinCleaningRepository = RbinCleaningRepository;
exports.RbinCleaningRepository = RbinCleaningRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], RbinCleaningRepository);
//# sourceMappingURL=rbin-cleaning.repository.js.map