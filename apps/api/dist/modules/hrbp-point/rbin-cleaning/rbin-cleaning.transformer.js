"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLookupKey = normalizeLookupKey;
exports.validateRbinStagedValues = validateRbinStagedValues;
exports.compareWithBaseline = compareWithBaseline;
exports.transformRbinRows = transformRbinRows;
exports.applyDuplicateIssues = applyDuplicateIssues;
const namelist_import_types_1 = require("../namelist-import/namelist-import.types");
const dateColumns = new Set([
    'birth_date', 'joining_date', 'entry_for_retirement', 'technical_entry_date',
]);
const integerColumns = new Set(['pers_no', 'global_id', 'hrbp_global_id']);
function normalizeLookupKey(value) {
    return value.trim().toLowerCase();
}
function validateDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function validateRbinStagedValues(values) {
    const issues = [];
    for (const column of namelist_import_types_1.namelistColumns) {
        const value = values[column].trim();
        if (!value) {
            const mappingColumn = column === 'range' || column === 'function';
            issues.push({
                column,
                code: mappingColumn ? 'mapping_not_found' : 'required',
                message: mappingColumn
                    ? `${column === 'range' ? 'Range' : 'Function'} mapping not found for this Organizational Unit.`
                    : 'Required value is missing.',
            });
            continue;
        }
        if (integerColumns.has(column) && !isPostgresBigInt(value)) {
            issues.push({ column, code: 'invalid', message: 'Enter a positive whole number within the BIGINT range.' });
        }
        if (dateColumns.has(column) && !validateDate(value)) {
            issues.push({ column, code: 'invalid', message: 'Enter a valid date in YYYY-MM-DD format.' });
        }
    }
    const email = values.official_email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        issues.push({ column: 'official_email', code: 'invalid', message: 'Enter a valid email address.' });
    }
    return issues;
}
function compareWithBaseline(values, baselineValues) {
    if (!baselineValues)
        return { comparisonStatus: 'new', changedColumns: [] };
    const changedColumns = namelist_import_types_1.namelistColumns.filter((column) => values[column].trim() !== baselineValues[column].trim());
    return {
        comparisonStatus: changedColumns.length ? 'changed' : 'unchanged',
        changedColumns,
    };
}
function toNamelistValues(row, mappings) {
    const raw = row.values;
    const orgKey = normalizeLookupKey(raw.organizational_unit);
    return {
        pers_no: raw.pers_no,
        personnel_number: raw.personnel_number,
        employee_group: raw.employee_group,
        lp: raw.lp,
        esgrp: raw.esgrp,
        employee_subgroup: raw.employee_subgroup,
        ps_group: raw.ps_group,
        organizational_unit: raw.organizational_unit,
        range: mappings.ranges.get(orgKey) ?? '',
        function: mappings.functions.get(orgKey) ?? '',
        organisational_area_pa: raw.organisational_area_pa,
        gender_key: raw.gender_key,
        location: raw.location,
        pa: raw.pa,
        personnel_area: raw.personnel_area,
        psubarea: raw.psubarea,
        personnel_subarea: raw.personnel_subarea,
        nt_id: raw.nt_id,
        global_id: raw.global_id,
        cost_center: raw.cost_center,
        birth_date: raw.birth_date,
        joining_date: raw.joining_date,
        entry_for_retirement: raw.entry_for_retirement,
        designation_text: raw.designation_text,
        hrbp_global_id: raw.hrbp_global_id,
        hrbp2_global_id: raw.hrbp2_global_id,
        official_email: raw.official_email,
        technical_entry_date: raw.technical_entry_date,
        direct_or_indirect: raw.direct_or_indirect,
    };
}
function transformRbinRows(rows, mappings, baselines) {
    const staged = rows
        .filter((row) => normalizeLookupKey(row.values.organisational_area_pa) === 'ps')
        .map((row) => {
        const values = toNamelistValues(row, mappings);
        const baselineValues = baselines.get(values.pers_no) ?? null;
        return {
            rowNumber: row.rowNumber,
            originalValues: { ...values },
            values,
            issues: validateRbinStagedValues(values),
            ...compareWithBaseline(values, baselineValues),
            baselineValues,
            rangeSource: values.range ? 'mapping' : 'missing',
            functionSource: values.function ? 'mapping' : 'missing',
        };
    });
    applyDuplicateIssues(staged);
    return staged;
}
function applyDuplicateIssues(rows) {
    const counts = new Map();
    rows.forEach((row) => {
        const persNo = row.values.pers_no.trim();
        if (persNo)
            counts.set(persNo, (counts.get(persNo) ?? 0) + 1);
    });
    rows.forEach((row) => {
        row.issues = row.issues.filter((issue) => issue.code !== 'duplicate');
        const persNo = row.values.pers_no.trim();
        if (persNo && (counts.get(persNo) ?? 0) > 1) {
            row.issues.push({
                column: 'pers_no',
                code: 'duplicate',
                message: 'Employee number is duplicated in this staged dataset.',
            });
        }
    });
}
function isPostgresBigInt(value) {
    if (!/^[1-9]\d*$/.test(value))
        return false;
    try {
        return BigInt(value) <= 9223372036854775807n;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=rbin-cleaning.transformer.js.map