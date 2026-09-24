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
var RbinExceptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbinExceptionsService = void 0;
const common_1 = require("@nestjs/common");
const namelist_import_types_1 = require("../namelist-import/namelist-import.types");
const rbin_exceptions_repository_1 = require("./rbin-exceptions.repository");
const rbin_exceptions_types_1 = require("./rbin-exceptions.types");
const maximumBigInt = BigInt('9223372036854775807');
const dateColumns = new Set(['birth_date', 'joining_date', 'entry_for_retirement', 'technical_entry_date']);
const integerColumns = new Set(['global_id', 'hrbp_global_id']);
let RbinExceptionsService = RbinExceptionsService_1 = class RbinExceptionsService {
    repository;
    logger = new common_1.Logger(RbinExceptionsService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async list(searchInput, filterInput, pageInput, pageSizeInput) {
        const search = searchInput?.trim() ?? '';
        if (search.length > 100)
            throw new common_1.BadRequestException('Search must not exceed 100 characters.');
        const filter = filterInput?.trim() ?? '';
        if (filter && !namelist_import_types_1.rbinExceptionColumns.includes(filter))
            throw new common_1.BadRequestException('Exception column filter is invalid.');
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 8, 100);
        const result = await this.run(() => this.repository.list(search, filter, page, pageSize), 'Unable to load employee exceptions');
        return { ...result, columns: namelist_import_types_1.rbinExceptionColumns.map((key) => ({ key, label: rbin_exceptions_types_1.rbinExceptionColumnLabels[key] })) };
    }
    async create(body, actorAccountId) {
        const record = this.record(body, ['persNo', 'rules']);
        const persNo = this.persNo(record.persNo);
        if (!Array.isArray(record.rules) || record.rules.length === 0 || record.rules.length > namelist_import_types_1.rbinExceptionColumns.length) {
            throw new common_1.BadRequestException('Add between 1 and 27 exception rules.');
        }
        const rules = record.rules.map((rule) => this.rule(rule));
        if (new Set(rules.map((rule) => rule.columnName)).size !== rules.length) {
            throw new common_1.BadRequestException('Each column may be selected only once per employee.');
        }
        return this.run(() => this.repository.createMany(persNo, rules, actorAccountId), 'Unable to create employee exceptions');
    }
    async update(idInput, body, actorAccountId) {
        const id = this.uuid(idInput);
        const record = this.record(body, ['persNo', 'columnName', 'fixedValue']);
        const input = {
            persNo: this.persNo(record.persNo),
            ...this.rule({ columnName: record.columnName, fixedValue: record.fixedValue }),
        };
        return this.run(async () => {
            const updated = await this.repository.update(id, input, actorAccountId);
            if (!updated)
                throw new common_1.NotFoundException('Employee exception was not found.');
            return updated;
        }, 'Unable to update employee exception');
    }
    async delete(idInput, actorAccountId) {
        const id = this.uuid(idInput);
        await this.run(async () => {
            if (!(await this.repository.delete(id, actorAccountId)))
                throw new common_1.NotFoundException('Employee exception was not found.');
        }, 'Unable to delete employee exception');
    }
    rule(value) {
        const record = this.record(value, ['columnName', 'fixedValue']);
        if (typeof record.columnName !== 'string' || !namelist_import_types_1.rbinExceptionColumns.includes(record.columnName)) {
            throw new common_1.BadRequestException('Select a valid non-identity Namelist column.');
        }
        if (typeof record.fixedValue !== 'string')
            throw new common_1.BadRequestException('Fixed value must be text.');
        const fixedValue = record.fixedValue.trim();
        if (!fixedValue || fixedValue.length > 500)
            throw new common_1.BadRequestException('Fixed value must contain 1 to 500 characters.');
        const columnName = record.columnName;
        if (integerColumns.has(columnName) && !this.validBigInt(fixedValue))
            throw new common_1.BadRequestException(`${rbin_exceptions_types_1.rbinExceptionColumnLabels[columnName]} must be a positive whole number within the BIGINT range.`);
        if (dateColumns.has(columnName) && !this.validDate(fixedValue))
            throw new common_1.BadRequestException(`${rbin_exceptions_types_1.rbinExceptionColumnLabels[columnName]} must be a valid date in YYYY-MM-DD format.`);
        if (columnName === 'official_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fixedValue))
            throw new common_1.BadRequestException('Official Email must be valid.');
        return { columnName, fixedValue };
    }
    record(value, keys) {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new common_1.BadRequestException('Exception values are required.');
        const record = value;
        const actual = Object.keys(record);
        if (actual.length !== keys.length || actual.some((key) => !keys.includes(key)))
            throw new common_1.BadRequestException(`Exception must contain exactly ${keys.join(', ')}.`);
        return record;
    }
    persNo(value) {
        if (typeof value !== 'string' || !this.validBigInt(value.trim()))
            throw new common_1.BadRequestException('Pers.No must be a positive whole number within the BIGINT range.');
        return value.trim();
    }
    validBigInt(value) { return value.length <= 19 && /^[1-9]\d*$/.test(value) && BigInt(value) <= maximumBigInt; }
    validDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
            return false;
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }
    uuid(value) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
            throw new common_1.BadRequestException('Exception ID is invalid.');
        return value;
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
            if (error?.code === '23505')
                throw new common_1.ConflictException('This employee already has an exception for one of the selected columns.');
            this.logger.error(message);
            throw new common_1.InternalServerErrorException(message);
        }
    }
};
exports.RbinExceptionsService = RbinExceptionsService;
exports.RbinExceptionsService = RbinExceptionsService = RbinExceptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rbin_exceptions_repository_1.RbinExceptionsRepository])
], RbinExceptionsService);
//# sourceMappingURL=rbin-exceptions.service.js.map