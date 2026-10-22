"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOrgStructureFile = parseOrgStructureFile;
const common_1 = require("@nestjs/common");
const exceljs_1 = __importDefault(require("exceljs"));
const org_structure_import_types_1 = require("./org-structure-import.types");
const expectedHeaders = {
    role_title: 'role title',
    reporting_to: 'reporting to',
    jd_id: 'jd id',
    career_level: 'career level',
    layer: 'layer',
    order_by: 'order by',
    is_active: 'is active',
    grade: 'grade',
    function: 'function',
};
const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function cellText(value) {
    if (value == null)
        return '';
    if (value instanceof Date)
        return value.toISOString().slice(0, 10);
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean')
        return String(value).trim();
    if ('result' in value && value.result != null)
        return cellText(value.result);
    if ('text' in value)
        return String(value.text).trim();
    if ('richText' in value)
        return value.richText.map((item) => item.text).join('').trim();
    return '';
}
async function parseOrgStructureFile(file) {
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
    const header = sheet.getRow(1);
    const mapped = org_structure_import_types_1.requiredOrgStructureColumns.map((column, index) => {
        const actual = normalize(cellText(header.getCell(index + 1).value));
        if (actual !== expectedHeaders[column]) {
            throw new common_1.BadRequestException(`Expected "${expectedHeaders[column]}" at column ${index + 1}.`);
        }
        return { column, index: index + 1 };
    });
    const seenOptional = new Set();
    for (let index = org_structure_import_types_1.requiredOrgStructureColumns.length + 1; index <= header.actualCellCount; index++) {
        const actual = normalize(cellText(header.getCell(index).value));
        if (!actual)
            continue;
        const column = org_structure_import_types_1.optionalOrgStructureColumns.find((candidate) => expectedHeaders[candidate] === actual);
        if (!column || seenOptional.has(column)) {
            throw new common_1.BadRequestException(`Expected optional "grade" or "function" at column ${index}.`);
        }
        seenOptional.add(column);
        mapped.push({ column, index });
    }
    const rows = [];
    for (let number = 2; number <= sheet.rowCount; number++) {
        const source = sheet.getRow(number);
        const cells = mapped.map(({ index }) => cellText(source.getCell(index).value));
        if (cells.every((cell) => !cell))
            continue;
        const values = Object.fromEntries(org_structure_import_types_1.orgStructureColumns.map((column) => [column, '']));
        mapped.forEach(({ column }, index) => { values[column] = cells[index]; });
        rows.push({
            rowNumber: number,
            values,
        });
        if (rows.length > 25_000)
            throw new common_1.PayloadTooLargeException('The workbook exceeds 25,000 rows.');
    }
    if (!rows.length)
        throw new common_1.BadRequestException('The workbook has no org structure rows.');
    return rows;
}
//# sourceMappingURL=org-structure-import.parser.js.map