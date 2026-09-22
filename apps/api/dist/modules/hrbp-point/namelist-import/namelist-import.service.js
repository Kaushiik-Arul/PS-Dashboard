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
var NamelistImportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamelistImportService = void 0;
const common_1 = require("@nestjs/common");
const namelist_import_types_1 = require("./namelist-import.types");
const namelist_import_parser_1 = require("./namelist-import.parser");
const namelist_import_repository_1 = require("./namelist-import.repository");
let NamelistImportService = NamelistImportService_1 = class NamelistImportService {
    repository;
    logger = new common_1.Logger(NamelistImportService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async createPreview(file, actorAccountId) {
        if (!file)
            throw new common_1.BadRequestException('A CSV or XLSX file is required.');
        let rows;
        try {
            rows = await (0, namelist_import_parser_1.parseNamelistFile)(file);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.BadRequestException('The uploaded file could not be parsed.');
        }
        return this.runDatabaseOperation(async () => {
            const previewId = await this.repository.createPreview(actorAccountId, file, rows);
            const preview = await this.repository.getSummary(previewId, actorAccountId);
            if (!preview)
                throw new Error('PREVIEW_NOT_FOUND');
            return preview;
        }, 'Unable to create namelist preview');
    }
    async getRows(previewId, actorAccountId, filterInput, pageInput, pageSizeInput) {
        const filter = filterInput === 'valid' || filterInput === 'invalid' ? filterInput : 'all';
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
        return this.runDatabaseOperation(async () => {
            const preview = await this.repository.getRows(previewId, actorAccountId, filter, page, pageSize);
            if (!preview)
                throw new common_1.NotFoundException('Namelist preview was not found or has expired.');
            return preview;
        }, 'Unable to load namelist preview');
    }
    async updateRow(previewId, rowNumberInput, input, actorAccountId) {
        const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
        const values = this.validateRowInput(input);
        return this.runDatabaseOperation(async () => {
            const rows = await this.repository.getAllRows(previewId, actorAccountId);
            if (!rows)
                throw new common_1.NotFoundException('Namelist preview was not found or has expired.');
            const target = rows.find((row) => row.rowNumber === rowNumber);
            if (!target)
                throw new common_1.NotFoundException('Preview row was not found.');
            target.values = values;
            const counts = new Map();
            rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
            rows.forEach((row) => {
                row.issues = (0, namelist_import_parser_1.validateNamelistRow)(row.values);
                if (row.values.pers_no && (counts.get(row.values.pers_no) ?? 0) > 1) {
                    row.issues.push({ column: 'pers_no', message: 'Employee number is duplicated in this file.' });
                }
            });
            await this.repository.replaceRows(previewId, actorAccountId, rows);
            const summary = await this.repository.getSummary(previewId, actorAccountId);
            if (!summary)
                throw new common_1.NotFoundException('Namelist preview was not found or has expired.');
            return summary;
        }, 'Unable to update namelist preview row');
    }
    async cancel(previewId, actorAccountId) {
        await this.runDatabaseOperation(async () => {
            if (!(await this.repository.cancel(previewId, actorAccountId))) {
                throw new common_1.NotFoundException('Namelist preview was not found or has expired.');
            }
        }, 'Unable to cancel namelist preview');
    }
    async commit(previewId, confirmReplacement, actorAccountId) {
        if (typeof confirmReplacement !== 'boolean')
            throw new common_1.BadRequestException('Replacement confirmation must be a boolean.');
        return this.runDatabaseOperation(async () => ({
            totalRows: await this.repository.commit(previewId, actorAccountId, confirmReplacement),
        }), 'Unable to import employee namelist');
    }
    validateRowInput(input) {
        if (typeof input !== 'object' || input === null || Array.isArray(input))
            throw new common_1.BadRequestException('Row values are required.');
        const record = input;
        const keys = Object.keys(record);
        if (keys.length !== namelist_import_types_1.namelistColumns.length || keys.some((key) => !namelist_import_types_1.namelistColumns.includes(key))) {
            throw new common_1.BadRequestException('Row values must contain exactly the employee namelist columns.');
        }
        const values = {};
        for (const column of namelist_import_types_1.namelistColumns) {
            if (typeof record[column] !== 'string')
                throw new common_1.BadRequestException(`${column} must be text.`);
            values[column] = record[column].trim();
        }
        return values;
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
    async runDatabaseOperation(operation, publicMessage) {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            if (error instanceof Error) {
                if (error.message === 'PREVIEW_NOT_FOUND')
                    throw new common_1.NotFoundException('Namelist preview was not found or has expired.');
                if (error.message === 'INVALID_ROWS')
                    throw new common_1.ConflictException('All invalid rows must be corrected before import.');
                if (error.message === 'REPLACEMENT_CONFIRMATION_REQUIRED')
                    throw new common_1.ConflictException('Confirm replacement of the completed current-month import.');
            }
            this.logger.error(publicMessage);
            throw new common_1.InternalServerErrorException(publicMessage);
        }
    }
};
exports.NamelistImportService = NamelistImportService;
exports.NamelistImportService = NamelistImportService = NamelistImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [namelist_import_repository_1.NamelistImportRepository])
], NamelistImportService);
//# sourceMappingURL=namelist-import.service.js.map