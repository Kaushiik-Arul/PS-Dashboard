"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanSuccessionPlanningValues = cleanSuccessionPlanningValues;
exports.validateSuccessionPlanningRows = validateSuccessionPlanningRows;
exports.parseSuccessionPlanningFile = parseSuccessionPlanningFile;
const common_1 = require("@nestjs/common");
const exceljs_1 = __importDefault(require("exceljs"));
const succession_planning_import_types_1 = require("./succession-planning-import.types");
const normalizeHeader = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const aliases = {
    entity: 'entity',
    'updated by': 'updated_by_name',
    'rp fc mg': 'area',
    area: 'area',
    jdid: 'position_jd_id',
    'jd id': 'position_jd_id',
    'jd name': 'jd_name',
    'ipe level': 'ipe_level',
    'e sub grp': 'employee_subgroup',
    'employee subgroup': 'employee_subgroup',
    'critical niche general': 'criticality',
    criticality: 'criticality',
    'high medium low': 'priority',
    priority: 'priority',
    'e no': 'incumbent_pers_no',
    'employee number': 'incumbent_pers_no',
    name: 'incumbent_name',
    'incumbent name': 'incumbent_name',
    'org unit': 'incumbent_org_unit',
    range: 'incumbent_range',
    'in current position since years': 'incumbent_tenure_years',
    age: 'incumbent_age',
    'incumbent change expected year': 'incumbent_change_year',
    '9 box rating 2024 2025 2026': 'incumbent_9_box_rating',
    'reason for change': 'reason_for_change',
    'employee number 1': 'successor1_pers_no',
    'successor 1': 'successor1_name',
    'current dept code 1': 'successor1_dept_code',
    'current jdid 1': 'successor1_current_jd_id',
    'readiness 1': 'successor1_readiness',
    '9 box rating 1': 'successor1_9_box_rating',
    'idp in hr global development dialog form 1': 'successor1_idp_status',
    'employee number 2': 'successor2_pers_no',
    'successor 2': 'successor2_name',
    'current dept code 2': 'successor2_dept_code',
    'current jdid 2': 'successor2_current_jd_id',
    'readiness 2': 'successor2_readiness',
    '9 box rating 2': 'successor2_9_box_rating',
    'idp in hr global development dialog form 2': 'successor2_idp_status',
};
const ignoredHeaders = new Set(['sl no', 'slno', 'serial no']);
function cellText(value) {
    if (value == null)
        return '';
    if (value instanceof Date)
        return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
        if ('result' in value && value.result != null)
            return cellText(value.result);
        if ('text' in value)
            return value.text.trim();
        if ('richText' in value)
            return value.richText
                .map((part) => part.text)
                .join('')
                .trim();
        return '';
    }
    return String(value).trim();
}
function cleanSuccessionPlanningValues(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new common_1.BadRequestException('Row values are required.');
    const record = input;
    const values = (0, succession_planning_import_types_1.emptySuccessionPlanningValues)();
    for (const column of succession_planning_import_types_1.successionPlanningColumns) {
        if (typeof record[column] !== 'string')
            throw new common_1.BadRequestException(`Provide ${column} as text.`);
        values[column] = record[column].trim();
    }
    return values;
}
function validateSuccessionPlanningRows(rows, jdLookup) {
    const normalized = rows.map((row) => {
        const values = { ...row.values };
        const canonicalJd = (column) => {
            const value = values[column];
            if (value.length < 3)
                return;
            const suffix = value.slice(-3).toLocaleLowerCase('en-US');
            const match = jdLookup.matches.get(suffix);
            if (match && !jdLookup.ambiguousSuffixes.has(suffix))
                values[column] = match;
        };
        canonicalJd('position_jd_id');
        canonicalJd('successor1_current_jd_id');
        canonicalJd('successor2_current_jd_id');
        return {
            ...row,
            values,
            issues: [],
        };
    });
    const occurrenceCounts = new Map();
    for (const row of normalized) {
        for (const column of ['successor1_pers_no', 'successor2_pers_no']) {
            for (const employeeNumber of row.values[column].match(/\d+/g) ?? [])
                occurrenceCounts.set(employeeNumber, (occurrenceCounts.get(employeeNumber) ?? 0) + 1);
        }
    }
    return normalized.map((row) => {
        for (const column of ['successor1_pers_no', 'successor2_pers_no']) {
            for (const employeeNumber of row.values[column].match(/\d+/g) ?? []) {
                const count = occurrenceCounts.get(employeeNumber) ?? 0;
                if (count > 2)
                    row.issues.push({
                        column,
                        employeeNumber,
                        message: `Employee appears ${count} times as a successor; maximum recommended is 2.`,
                        severity: 'warning',
                        occurrences: count,
                    });
            }
        }
        return row;
    });
}
function headerMapping(sheet) {
    const maximumHeaderRow = Math.min(sheet.rowCount, 20);
    for (let rowNumber = 1; rowNumber <= maximumHeaderRow; rowNumber++) {
        const mapping = new Map();
        const unknown = [];
        sheet.getRow(rowNumber).eachCell((cell, columnNumber) => {
            const text = cellText(cell.value);
            if (!text)
                return;
            const normalized = normalizeHeader(text);
            if (ignoredHeaders.has(normalized))
                return;
            const column = aliases[normalized];
            if (!column)
                unknown.push(text);
            else if ([...mapping.values()].includes(column))
                throw new common_1.BadRequestException(`Repeated column: ${text}.`);
            else
                mapping.set(columnNumber, column);
        });
        const mapped = new Set(mapping.values());
        if (mapped.has('position_jd_id') &&
            mapped.has('incumbent_pers_no') &&
            mapped.has('successor1_pers_no')) {
            if (unknown.length)
                throw new common_1.BadRequestException(`Unexpected columns: ${unknown.join(', ')}.`);
            const missing = succession_planning_import_types_1.successionPlanningColumns.filter((column) => !mapped.has(column));
            if (missing.length)
                throw new common_1.BadRequestException(`Missing columns: ${missing.join(', ')}.`);
            return { rowNumber, mapping };
        }
    }
    throw new common_1.BadRequestException('Could not find the Succession Planning column header row.');
}
async function parseSuccessionPlanningFile(file) {
    if (!/\.xlsx$/i.test(file.originalname))
        throw new common_1.BadRequestException('Choose an XLSX workbook.');
    const workbook = new exceljs_1.default.Workbook();
    try {
        await workbook.xlsx.load(file.buffer);
    }
    catch {
        throw new common_1.BadRequestException('The XLSX workbook could not be read.');
    }
    const sheet = workbook.worksheets[0];
    if (!sheet)
        throw new common_1.BadRequestException('The workbook has no worksheets.');
    if (sheet.rowCount > 25020)
        throw new common_1.PayloadTooLargeException('The worksheet exceeds 25,000 data rows.');
    const header = headerMapping(sheet);
    const rows = [];
    for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber++) {
        const values = (0, succession_planning_import_types_1.emptySuccessionPlanningValues)();
        for (const [columnNumber, column] of header.mapping) {
            const raw = sheet.getRow(rowNumber).getCell(columnNumber).value;
            if ((column.endsWith('_pers_no') || column === 'incumbent_pers_no') &&
                typeof raw === 'number' &&
                !Number.isSafeInteger(raw))
                throw new common_1.BadRequestException(`Excel row ${rowNumber}: format employee numbers as text to preserve them.`);
            values[column] = cellText(raw);
        }
        if (succession_planning_import_types_1.successionPlanningColumns.every((column) => !values[column]))
            continue;
        rows.push({
            rowNumber,
            values: cleanSuccessionPlanningValues(values),
            issues: [],
        });
    }
    if (!rows.length)
        throw new common_1.BadRequestException('The workbook has no data rows.');
    return rows;
}
//# sourceMappingURL=succession-planning-import.parser.js.map