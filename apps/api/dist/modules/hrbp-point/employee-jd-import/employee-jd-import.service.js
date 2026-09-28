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
var EmployeeJdImportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeJdImportService = void 0;
const common_1 = require("@nestjs/common");
const employee_jd_import_parser_1 = require("./employee-jd-import.parser");
const employee_jd_import_repository_1 = require("./employee-jd-import.repository");
const employee_jd_import_types_1 = require("./employee-jd-import.types");
let EmployeeJdImportService = EmployeeJdImportService_1 = class EmployeeJdImportService {
    repository;
    logger = new common_1.Logger(EmployeeJdImportService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async createPreview(file, actorAccountId) {
        if (!file)
            throw new common_1.BadRequestException('An XLSX file is required.');
        let parsedRows;
        try {
            parsedRows = await (0, employee_jd_import_parser_1.parseEmployeeJdFile)(file);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.BadRequestException('The uploaded workbook could not be parsed.');
        }
        return this.run(async () => {
            const rows = await this.revalidateRows(parsedRows);
            const previewId = await this.repository.createPreview(actorAccountId, file, rows);
            const preview = await this.repository.getSummary(previewId, actorAccountId);
            if (!preview)
                throw new Error('PREVIEW_NOT_FOUND');
            return preview;
        }, 'Unable to create employee JD preview');
    }
    async getRows(previewId, actorAccountId, filterInput, pageInput, pageSizeInput) {
        const filter = filterInput === 'valid' || filterInput === 'warning' || filterInput === 'invalid' ? filterInput : 'all';
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 25, 100);
        return this.run(async () => {
            const preview = await this.repository.getRows(previewId, actorAccountId, filter, page, pageSize);
            if (!preview)
                throw new common_1.NotFoundException('Employee JD preview was not found or has expired.');
            return preview;
        }, 'Unable to load employee JD preview');
    }
    async updateRow(previewId, rowNumberInput, input, actorAccountId) {
        const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
        const values = this.validateRowInput(input);
        return this.run(async () => {
            const rows = await this.repository.getAllRows(previewId, actorAccountId);
            if (!rows)
                throw new common_1.NotFoundException('Employee JD preview was not found or has expired.');
            const target = rows.find((row) => row.rowNumber === rowNumber);
            if (!target)
                throw new common_1.NotFoundException('Preview row was not found.');
            target.values = values;
            await this.repository.replaceRows(previewId, actorAccountId, await this.revalidateRows(rows));
            const summary = await this.repository.getSummary(previewId, actorAccountId);
            if (!summary)
                throw new common_1.NotFoundException('Employee JD preview was not found or has expired.');
            return summary;
        }, 'Unable to update employee JD preview row');
    }
    async deleteRow(previewId, rowNumberInput, actorAccountId) {
        const rowNumber = this.positiveInteger(rowNumberInput, 0, 2_147_483_647);
        await this.run(async () => {
            if (!(await this.repository.deleteRow(previewId, actorAccountId, rowNumber))) {
                throw new common_1.NotFoundException('Preview row was not found.');
            }
        }, 'Unable to delete employee JD preview row');
    }
    async cancel(previewId, actorAccountId) {
        await this.run(async () => {
            if (!(await this.repository.cancel(previewId, actorAccountId))) {
                throw new common_1.NotFoundException('Employee JD preview was not found or has expired.');
            }
        }, 'Unable to cancel employee JD preview');
    }
    commit(previewId, confirmReplacement, actorAccountId) {
        if (typeof confirmReplacement !== 'boolean') {
            throw new common_1.BadRequestException('Replacement confirmation must be a boolean.');
        }
        return this.run(() => this.repository.commit(previewId, actorAccountId, confirmReplacement), 'Unable to import employee JD assignments');
    }
    async revalidateRows(rows) {
        const counts = new Map();
        rows.forEach((row) => counts.set(row.values.pers_no, (counts.get(row.values.pers_no) ?? 0) + 1));
        const validPersNos = rows.map((row) => row.values.pers_no)
            .filter((value) => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n);
        const candidateJdIds = rows.map((row) => row.values.jd_id.trim()).filter(Boolean);
        const [knownPersNos, knownJdIds] = await Promise.all([
            this.repository.getKnownPersNos([...new Set(validPersNos)]),
            this.repository.getKnownJdIds([...new Set(candidateJdIds.map((value) => value.slice(-3).toLowerCase()))]),
        ]);
        return rows.map((row) => {
            const values = {
                pers_no: row.values.pers_no.trim(),
                jd_id: row.values.jd_id.trim().toUpperCase(),
            };
            const issues = (0, employee_jd_import_parser_1.validateEmployeeJdRow)(values);
            if (values.pers_no && (counts.get(values.pers_no) ?? 0) > 1) {
                issues.push({ column: 'pers_no', message: 'Employee number is duplicated in this workbook.' });
            }
            else if (!issues.some((issue) => issue.column === 'pers_no') && !knownPersNos.has(values.pers_no)) {
                issues.push({ column: 'pers_no', message: 'Employee is not in the current namelist.' });
            }
            const canonicalJdId = knownJdIds.get(values.jd_id.slice(-3).toLowerCase());
            if (values.jd_id && !issues.some((issue) => issue.column === 'jd_id') && !canonicalJdId) {
                issues.push({ column: 'jd_id', message: 'JD ID suffix does not uniquely match the JD master.' });
            }
            else if (canonicalJdId) {
                values.jd_id = canonicalJdId;
            }
            return { ...row, values, issues };
        });
    }
    validateRowInput(input) {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            throw new common_1.BadRequestException('Row values are required.');
        }
        const record = input;
        const keys = Object.keys(record);
        if (keys.length !== employee_jd_import_types_1.employeeJdColumns.length || keys.some((key) => !employee_jd_import_types_1.employeeJdColumns.includes(key))) {
            throw new common_1.BadRequestException('Row values must contain exactly Pers.No. and JD ID.');
        }
        if (typeof record.pers_no !== 'string' || typeof record.jd_id !== 'string') {
            throw new common_1.BadRequestException('Pers.No. and JD ID must be text.');
        }
        return { pers_no: record.pers_no.trim(), jd_id: record.jd_id.trim().toUpperCase() };
    }
    positiveInteger(value, fallback, maximum) {
        if (value === undefined)
            return fallback;
        if (!/^\d+$/.test(value))
            throw new common_1.BadRequestException('Pagination values must be positive whole numbers.');
        const parsed = Number(value);
        if (parsed < 1 || parsed > maximum) {
            throw new common_1.BadRequestException(`Pagination value must be between 1 and ${maximum}.`);
        }
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
                    throw new common_1.NotFoundException('Employee JD preview was not found or has expired.');
                if (error.message === 'LAST_PREVIEW_ROW')
                    throw new common_1.ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
                if (error.message === 'INVALID_ROWS')
                    throw new common_1.ConflictException('All invalid rows must be corrected before import.');
                if (error.message === 'STALE_PREVIEW') {
                    throw new common_1.ConflictException('Employee or JD master data changed after validation. Upload the workbook again.');
                }
                if (error.message === 'REPLACEMENT_CONFIRMATION_REQUIRED') {
                    throw new common_1.ConflictException('Confirm replacement of all current employee JD assignments.');
                }
            }
            this.logger.error(publicMessage);
            throw new common_1.InternalServerErrorException(publicMessage);
        }
    }
};
exports.EmployeeJdImportService = EmployeeJdImportService;
exports.EmployeeJdImportService = EmployeeJdImportService = EmployeeJdImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [employee_jd_import_repository_1.EmployeeJdImportRepository])
], EmployeeJdImportService);
//# sourceMappingURL=employee-jd-import.service.js.map