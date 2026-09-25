"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRbinFile = parseRbinFile;
const common_1 = require("@nestjs/common");
const sync_1 = require("csv-parse/sync");
const exceljs_1 = __importDefault(require("exceljs"));
const rbin_cleaning_types_1 = require("./rbin-cleaning.types");
const expectedHeaders = new Set(rbin_cleaning_types_1.rbinSourceColumns);
const headerAliases = {
    pers_no: 'pers_no',
    personnel_no: 'personnel_number',
    date_of_joinin: 'joining_date',
    date_of_joining: 'joining_date',
    cost_ctr: 'cost_center',
    date_of_birth: 'birth_date',
    email_official: 'official_email',
    global_id_of_hrbp: 'hrbp_global_id',
    global_id_of_hrbp2: 'hrbp2_global_id',
};
function normalizeHeader(value) {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return headerAliases[normalized] ?? normalized;
}
function normalizeHeaders(values) {
    const headers = values.map(normalizeHeader);
    const hrbpIndexes = headers.flatMap((header, index) => header === 'hrbp_global_id' ? [index] : []);
    if (hrbpIndexes.length === 2 && !headers.includes('hrbp2_global_id')) {
        headers[hrbpIndexes[1]] = 'hrbp2_global_id';
    }
    return headers;
}
function formatDate(value) {
    return [
        value.getUTCFullYear(),
        String(value.getUTCMonth() + 1).padStart(2, '0'),
        String(value.getUTCDate()).padStart(2, '0'),
    ].join('-');
}
function cellToString(value) {
    if (value === null || value === undefined)
        return '';
    if (value instanceof Date)
        return formatDate(value);
    if (typeof value === 'string' || typeof value === 'boolean')
        return String(value);
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) {
            throw new common_1.BadRequestException('The workbook contains an identifier larger than Excel can safely represent. Format identifier columns as text.');
        }
        return String(value);
    }
    if (typeof value === 'object') {
        if ('text' in value && typeof value.text === 'string')
            return value.text;
        if ('result' in value && value.result !== undefined)
            return cellToString(value.result);
        if ('richText' in value)
            return value.richText.map((part) => part.text).join('');
    }
    return '';
}
function mapRows(matrix) {
    if (matrix.length < 2) {
        throw new common_1.BadRequestException('The file must contain a header and at least one data row.');
    }
    const headers = normalizeHeaders(matrix[0]);
    const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
    const missing = rbin_cleaning_types_1.rbinSourceColumns.filter((column) => !headers.includes(column));
    const unknown = headers.filter((header) => !expectedHeaders.has(header));
    if (duplicates.length || missing.length || unknown.length || headers.length !== rbin_cleaning_types_1.rbinSourceColumns.length) {
        const details = [
            missing.length ? `Missing: ${missing.join(', ')}.` : '',
            unknown.length ? `Unknown: ${[...new Set(unknown)].join(', ')}.` : '',
            duplicates.length ? `Duplicates: ${[...new Set(duplicates)].join(', ')}.` : '',
        ].filter(Boolean).join(' ');
        throw new common_1.BadRequestException(`The uploaded columns do not match the raw RBIN schema. ${details}`);
    }
    const populatedRows = matrix.slice(1).filter((cells) => cells.some((cell) => cell.trim() !== ''));
    const extraCellIndex = populatedRows.findIndex((cells) => cells.length > headers.length);
    if (extraCellIndex >= 0) {
        throw new common_1.BadRequestException(`Source row ${extraCellIndex + 2} contains more values than the header declares.`);
    }
    const rows = populatedRows.map((cells, index) => ({
        rowNumber: index + 2,
        values: Object.fromEntries(headers.map((header, cellIndex) => [header, (cells[cellIndex] ?? '').trim()])),
    }));
    if (!rows.length)
        throw new common_1.BadRequestException('The file does not contain any employee rows.');
    if (rows.length > 25_000)
        throw new common_1.PayloadTooLargeException('The file exceeds the 25,000 row limit.');
    return rows;
}
async function parseRbinFile(file) {
    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (extension === '.csv') {
        const matrix = (0, sync_1.parse)(file.buffer, {
            bom: true,
            relax_column_count: true,
            skip_empty_lines: true,
        });
        return mapRows(matrix.map((row) => row.map(String)));
    }
    if (extension !== '.xlsx')
        throw new common_1.BadRequestException('Only CSV and XLSX files are supported.');
    const workbook = new exceljs_1.default.Workbook();
    await workbook.xlsx.load(file.buffer);
    const populatedSheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
    if (populatedSheets.length !== 1) {
        throw new common_1.BadRequestException('The workbook must contain exactly one non-empty worksheet.');
    }
    const matrix = [];
    populatedSheets[0].eachRow({ includeEmpty: true }, (row) => {
        matrix.push(Array.from({ length: row.cellCount }, (_, index) => cellToString(row.getCell(index + 1).value)));
    });
    return mapRows(matrix);
}
//# sourceMappingURL=rbin-cleaning.parser.js.map