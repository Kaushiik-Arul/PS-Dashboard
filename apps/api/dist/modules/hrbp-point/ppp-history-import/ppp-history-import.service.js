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
var PppHistoryImportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PppHistoryImportService = void 0;
const common_1 = require("@nestjs/common");
const ppp_history_import_parser_1 = require("./ppp-history-import.parser");
const ppp_history_import_repository_1 = require("./ppp-history-import.repository");
const ppp_history_import_types_1 = require("./ppp-history-import.types");
let PppHistoryImportService = PppHistoryImportService_1 = class PppHistoryImportService {
    repository;
    logger = new common_1.Logger(PppHistoryImportService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async createPreview(file, actorAccountId) {
        if (!file)
            throw new common_1.BadRequestException('A CSV or XLSX file is required.');
        let parsed;
        try {
            parsed = await (0, ppp_history_import_parser_1.parsePppHistoryFile)(file);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.BadRequestException('The uploaded file could not be parsed.');
        }
        return this.run(async () => {
            const rows = await this.revalidateRows(parsed.rows);
            const previewId = await this.repository.createPreview(actorAccountId, file, parsed.currentYear, rows);
            const preview = await this.repository.getSummary(previewId, actorAccountId);
            if (!preview)
                throw new Error('PREVIEW_NOT_FOUND');
            return preview;
        }, 'Unable to create PPP history preview');
    }
    async getRows(previewId, actorAccountId, filterInput, pageInput, pageSizeInput) {
        const filter = ['valid', 'warning', 'invalid'].includes(filterInput ?? '') ? filterInput : 'all';
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
        return this.run(async () => {
            const preview = await this.repository.getRows(previewId, actorAccountId, filter, page, pageSize);
            if (!preview)
                throw new common_1.NotFoundException('PPP history preview was not found or has expired.');
            return preview;
        }, 'Unable to load PPP history preview');
    }
    async updateRow(previewId, rowNumberInput, input, actorAccountId) {
        const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
        const values = this.validateRowInput(input);
        return this.run(async () => {
            const rows = await this.repository.getAllRows(previewId, actorAccountId);
            if (!rows)
                throw new common_1.NotFoundException('PPP history preview was not found or has expired.');
            const target = rows.find((row) => row.rowNumber === rowNumber);
            if (!target)
                throw new common_1.NotFoundException('Preview row was not found.');
            target.values = values;
            await this.repository.replaceRows(previewId, actorAccountId, await this.revalidateRows(rows));
            const summary = await this.repository.getSummary(previewId, actorAccountId);
            if (!summary)
                throw new common_1.NotFoundException('PPP history preview was not found or has expired.');
            return summary;
        }, 'Unable to update PPP history preview row');
    }
    async cancel(previewId, actorAccountId) {
        await this.run(async () => {
            if (!(await this.repository.cancel(previewId, actorAccountId))) {
                throw new common_1.NotFoundException('PPP history preview was not found or has expired.');
            }
        }, 'Unable to cancel PPP history preview');
    }
    async commit(previewId, confirmReplacement, actorAccountId) {
        if (typeof confirmReplacement !== 'boolean')
            throw new common_1.BadRequestException('Replacement confirmation must be a boolean.');
        return this.run(() => this.repository.commit(previewId, actorAccountId, confirmReplacement, new Date().getUTCFullYear()), 'Unable to import PPP history');
    }
    async revalidateRows(rows) {
        const counts = new Map();
        rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
        const validPersNos = rows.map((row) => row.values.pers_no).filter((value) => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n);
        const knownPersNos = await this.repository.getKnownPersNos([...new Set(validPersNos)]);
        return rows.map((row) => {
            const issues = (0, ppp_history_import_parser_1.validatePppImportRow)(row.values);
            if (row.values.pers_no && (counts.get(row.values.pers_no) ?? 0) > 1) {
                issues.push({ column: 'pers_no', message: 'Employee number is duplicated in this file.', severity: 'error' });
            }
            else if (!issues.length && !knownPersNos.has(row.values.pers_no)) {
                issues.push({ column: 'pers_no', message: 'Employee is not in the current namelist and will be skipped.', severity: 'warning' });
            }
            return { ...row, issues };
        });
    }
    validateRowInput(input) {
        if (typeof input !== 'object' || input === null || Array.isArray(input))
            throw new common_1.BadRequestException('Row values are required.');
        const record = input;
        const keys = Object.keys(record);
        if (keys.length !== ppp_history_import_types_1.pppImportColumns.length || keys.some((key) => !ppp_history_import_types_1.pppImportColumns.includes(key))) {
            throw new common_1.BadRequestException('Row values must contain exactly the PPP history columns.');
        }
        const values = {};
        for (const column of ppp_history_import_types_1.pppImportColumns) {
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
    async run(operation, publicMessage) {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            if (error instanceof Error) {
                if (error.message === 'PREVIEW_NOT_FOUND')
                    throw new common_1.NotFoundException('PPP history preview was not found or has expired.');
                if (error.message === 'INVALID_ROWS')
                    throw new common_1.ConflictException('All invalid rows must be corrected before import.');
                if (error.message === 'STALE_YEAR')
                    throw new common_1.ConflictException('This preview belongs to a previous calendar year. Upload the current workbook again.');
                if (error.message === 'NO_IMPORTABLE_ROWS')
                    throw new common_1.ConflictException('The file does not contain any employees from the current namelist.');
                if (error.message === 'REPLACEMENT_CONFIRMATION_REQUIRED')
                    throw new common_1.ConflictException('Confirm replacement of the complete PPP history dataset.');
            }
            this.logger.error(publicMessage);
            throw new common_1.InternalServerErrorException(publicMessage);
        }
    }
};
exports.PppHistoryImportService = PppHistoryImportService;
exports.PppHistoryImportService = PppHistoryImportService = PppHistoryImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ppp_history_import_repository_1.PppHistoryImportRepository])
], PppHistoryImportService);
//# sourceMappingURL=ppp-history-import.service.js.map