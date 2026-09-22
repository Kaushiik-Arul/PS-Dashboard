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
var RbinMappingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbinMappingsService = void 0;
const common_1 = require("@nestjs/common");
const rbin_mappings_repository_1 = require("./rbin-mappings.repository");
const rbin_mappings_types_1 = require("./rbin-mappings.types");
let RbinMappingsService = RbinMappingsService_1 = class RbinMappingsService {
    repository;
    logger = new common_1.Logger(RbinMappingsService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    list(kindInput, searchInput, filterInput, pageInput, pageSizeInput) {
        const kind = this.validateKind(kindInput);
        const search = searchInput?.trim() ?? '';
        const filter = filterInput?.trim() ?? '';
        if (search.length > 100)
            throw new common_1.BadRequestException('Search must not exceed 100 characters.');
        if (filter.length > 200)
            throw new common_1.BadRequestException('Filter must not exceed 200 characters.');
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 8, 100);
        return this.runDatabaseOperation(() => this.repository.list(kind, search, filter, page, pageSize), `Unable to load ${kind} mappings`);
    }
    async create(kindInput, body) {
        const kind = this.validateKind(kindInput);
        const input = this.validateInput(body);
        return this.runDatabaseOperation(async () => {
            const created = await this.repository.create(kind, input);
            if (!created)
                throw new common_1.ConflictException('This Organizational Unit already has a mapping.');
            return created;
        }, `Unable to create ${kind} mapping`);
    }
    async update(kindInput, idInput, body) {
        const kind = this.validateKind(kindInput);
        const id = this.validateId(idInput);
        const input = this.validateInput(body);
        return this.runDatabaseOperation(async () => {
            const updated = await this.repository.update(kind, id, input);
            if (!updated)
                throw new common_1.NotFoundException('Mapping was not found.');
            return updated;
        }, `Unable to update ${kind} mapping`);
    }
    async delete(kindInput, idInput) {
        const kind = this.validateKind(kindInput);
        const id = this.validateId(idInput);
        await this.runDatabaseOperation(async () => {
            if (!(await this.repository.delete(kind, id)))
                throw new common_1.NotFoundException('Mapping was not found.');
        }, `Unable to delete ${kind} mapping`);
    }
    validateKind(value) {
        if (!rbin_mappings_types_1.rbinMappingKinds.includes(value)) {
            throw new common_1.BadRequestException('Mapping type must be ranges or functions.');
        }
        return value;
    }
    validateId(value) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
            throw new common_1.BadRequestException('Mapping ID is invalid.');
        }
        return value;
    }
    validateInput(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new common_1.BadRequestException('Mapping values are required.');
        }
        const record = value;
        const keys = Object.keys(record);
        if (keys.length !== 2 || keys.some((key) => key !== 'organizationalUnit' && key !== 'value')) {
            throw new common_1.BadRequestException('Mapping must contain Organizational Unit and value.');
        }
        if (typeof record.organizationalUnit !== 'string' || typeof record.value !== 'string') {
            throw new common_1.BadRequestException('Mapping values must be text.');
        }
        const organizationalUnit = record.organizationalUnit.trim();
        const mappedValue = record.value.trim();
        if (!organizationalUnit || !mappedValue)
            throw new common_1.BadRequestException('Mapping values are required.');
        if (organizationalUnit.length > 200 || mappedValue.length > 200) {
            throw new common_1.BadRequestException('Mapping values must not exceed 200 characters.');
        }
        return { organizationalUnit, value: mappedValue };
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
            if (error?.code === '23505') {
                throw new common_1.ConflictException('This Organizational Unit already has a mapping.');
            }
            this.logger.error(publicMessage);
            throw new common_1.InternalServerErrorException(publicMessage);
        }
    }
};
exports.RbinMappingsService = RbinMappingsService;
exports.RbinMappingsService = RbinMappingsService = RbinMappingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rbin_mappings_repository_1.RbinMappingsRepository])
], RbinMappingsService);
//# sourceMappingURL=rbin-mappings.service.js.map