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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AttritionMovementsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttritionMovementsService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const exceljs_1 = __importDefault(require("exceljs"));
const attrition_movements_repository_1 = require("./attrition-movements.repository");
const attrition_movements_types_1 = require("./attrition-movements.types");
const exportRowLimit = 100_000;
const exportColumns = [
    { key: 'persNo', header: 'Pers.No', width: 14 },
    { key: 'eventMonth', header: 'Event Month', width: 15 },
    { key: 'exitLwd', header: 'Last Working Day', width: 18 },
    { key: 'eventType', header: 'Event Type', width: 16 },
    { key: 'transferType', header: 'Transfer Type', width: 24 },
    { key: 'withinPsType', header: 'Within-PS Type', width: 20 },
    { key: 'exitReason', header: 'Exit Reason', width: 28 },
    { key: 'oldOrganisationalAreaPa', header: 'Previous Area', width: 22 },
    { key: 'newOrganisationalAreaPa', header: 'Current Area', width: 22 },
    { key: 'oldOrganizationalUnit', header: 'Previous Org Unit', width: 24 },
    { key: 'newOrganizationalUnit', header: 'Current Org Unit', width: 24 },
    { key: 'oldRange', header: 'Previous Range', width: 20 },
    { key: 'newRange', header: 'Current Range', width: 20 },
    { key: 'oldRangeType', header: 'Previous Range Type', width: 21 },
    { key: 'newRangeType', header: 'Current Range Type', width: 21 },
    { key: 'notes', header: 'Notes', width: 36 },
];
function excelDate(value) {
    return value ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : null;
}
function movementCategory(row) {
    if (row.eventType !== 'transfer')
        return row.eventType;
    return row.transferType ?? 'transfer';
}
let AttritionMovementsService = AttritionMovementsService_1 = class AttritionMovementsService {
    repository;
    logger = new common_1.Logger(AttritionMovementsService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async exportConfirmedHistory(actorAccountId) {
        return this.run(async () => {
            const rows = await this.repository.getConfirmedExportRows();
            if (rows.length > exportRowLimit) {
                throw new common_1.BadRequestException(`Confirmed movement export cannot exceed ${exportRowLimit.toLocaleString('en-US')} rows.`);
            }
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = 'PS Dashboard';
            workbook.created = new Date();
            this.addSummarySheet(workbook, rows);
            this.addMovementsSheet(workbook, rows);
            const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
            const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
            const fileName = `PS_Confirmed_Attrition_All_History_${stamp}.xlsx`;
            await this.repository.recordExport(actorAccountId, rows.length, fileName, (0, node_crypto_1.createHash)('sha256').update(buffer).digest('hex'));
            return { fileName, buffer };
        }, 'Unable to export confirmed attrition history');
    }
    async list(viewInput, searchInput, yearInput, monthInput, pageInput, pageSizeInput) {
        const view = (viewInput?.trim() || 'all');
        if (!attrition_movements_types_1.attritionMovementViews.includes(view))
            throw new common_1.BadRequestException('Attrition movement view is invalid.');
        const search = searchInput?.trim() ?? '';
        if (search.length > 100)
            throw new common_1.BadRequestException('Search must not exceed 100 characters.');
        const year = this.optionalInteger(yearInput, 'Year', 2000, 2100);
        const month = this.optionalInteger(monthInput, 'Month', 1, 12);
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
        return this.run(() => this.repository.list(view, search, year, month, page, pageSize), 'Unable to load attrition movements');
    }
    async dismissCandidate(candidateId, actor) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidateId)) {
            throw new common_1.BadRequestException('Invalid departure candidate ID.');
        }
        const dismissed = await this.run(() => this.repository.dismissCandidate(candidateId, actor), 'Unable to dismiss the departure candidate');
        if (!dismissed)
            throw new common_1.NotFoundException('Pending departure candidate was not found.');
    }
    addSummarySheet(workbook, rows) {
        const sheet = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.columns = [{ width: 30 }, { width: 18 }];
        sheet.addRow(['Confirmed Attrition History', 'Count']);
        sheet.addRow(['All confirmed movements', rows.length]);
        sheet.addRow(['PS attrition', rows.filter((row) => row.countsAsPsAttrition).length]);
        sheet.addRow(['Within-PS movements', rows.filter((row) => !row.countsAsPsAttrition).length]);
        sheet.addRow([]);
        sheet.addRow(['Movement category', 'Count']);
        const categoryCounts = new Map();
        rows.forEach((row) => categoryCounts.set(movementCategory(row), (categoryCounts.get(movementCategory(row)) ?? 0) + 1));
        [...categoryCounts].sort(([left], [right]) => left.localeCompare(right))
            .forEach(([category, count]) => sheet.addRow([category, count]));
        sheet.addRow([]);
        sheet.addRow(['Source', 'Count']);
        const sourceCounts = new Map();
        rows.forEach((row) => sourceCounts.set(row.source, (sourceCounts.get(row.source) ?? 0) + 1));
        [...sourceCounts].sort(([left], [right]) => left.localeCompare(right))
            .forEach(([source, count]) => sheet.addRow([source, count]));
        sheet.addRow([]);
        sheet.addRow(['Range classification', 'Count']);
        const rangeTypeCounts = new Map();
        rows.forEach((row) => {
            const rangeType = row.newRangeType ?? row.oldRangeType ?? 'not_available';
            rangeTypeCounts.set(rangeType, (rangeTypeCounts.get(rangeType) ?? 0) + 1);
        });
        [...rangeTypeCounts].sort(([left], [right]) => left.localeCompare(right))
            .forEach(([rangeType, count]) => sheet.addRow([rangeType, count]));
        sheet.addRow([]);
        sheet.addRow(['Event year', 'Count']);
        const yearCounts = new Map();
        rows.forEach((row) => {
            const year = row.eventMonth.slice(0, 4);
            yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
        });
        [...yearCounts].sort(([left], [right]) => right.localeCompare(left))
            .forEach(([year, count]) => sheet.addRow([year, count]));
        sheet.addRow([]);
        sheet.addRow(['Event month', 'Count']);
        const monthCounts = new Map();
        rows.forEach((row) => {
            const month = row.eventMonth.slice(0, 7);
            monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
        });
        [...monthCounts].sort(([left], [right]) => right.localeCompare(left))
            .forEach(([month, count]) => sheet.addRow([month, count]));
        const sourceHeaderRow = 8 + categoryCounts.size;
        const rangeHeaderRow = sourceHeaderRow + sourceCounts.size + 2;
        const yearHeaderRow = rangeHeaderRow + rangeTypeCounts.size + 2;
        const monthHeaderRow = yearHeaderRow + yearCounts.size + 2;
        [1, 6, sourceHeaderRow, rangeHeaderRow, yearHeaderRow, monthHeaderRow]
            .forEach((rowNumber) => { sheet.getRow(rowNumber).font = { bold: true }; });
    }
    addMovementsSheet(workbook, rows) {
        const sheet = workbook.addWorksheet('Confirmed Movements', { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.columns = exportColumns.map((column) => ({ ...column }));
        sheet.getRow(1).font = { bold: true };
        rows.forEach((source) => {
            const row = sheet.addRow(exportColumns.map(({ key }) => {
                if (key === 'eventMonth' || key === 'exitLwd')
                    return excelDate(source[key]);
                if (key === 'createdAt' || key === 'updatedAt')
                    return new Date(source[key]);
                return source[key] ?? null;
            }));
            row.getCell(1).numFmt = '@';
            row.getCell(2).numFmt = 'mmm yyyy';
            row.getCell(3).numFmt = 'dd mmm yyyy';
        });
        sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(exportColumns.length).letter}1` };
    }
    optionalInteger(value, label, minimum, maximum) {
        if (value === undefined || value.trim() === '')
            return null;
        if (!/^\d+$/.test(value))
            throw new common_1.BadRequestException(`${label} must be a whole number.`);
        const parsed = Number(value);
        if (parsed < minimum || parsed > maximum)
            throw new common_1.BadRequestException(`${label} must be between ${minimum} and ${maximum}.`);
        return parsed;
    }
    positiveInteger(value, fallback, maximum) {
        if (value === undefined)
            return fallback;
        if (!/^\d+$/.test(value))
            throw new common_1.BadRequestException('Pagination values must be positive whole numbers.');
        const parsed = Number(value);
        if (parsed < 1 || parsed > maximum)
            throw new common_1.BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
        return parsed;
    }
    async run(operation, message) {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            this.logger.error(message);
            throw new common_1.InternalServerErrorException(message);
        }
    }
};
exports.AttritionMovementsService = AttritionMovementsService;
exports.AttritionMovementsService = AttritionMovementsService = AttritionMovementsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [attrition_movements_repository_1.AttritionMovementsRepository])
], AttritionMovementsService);
//# sourceMappingURL=attrition-movements.service.js.map