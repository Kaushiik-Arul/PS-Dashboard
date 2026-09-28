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
var JobDescriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobDescriptionsService = void 0;
const common_1 = require("@nestjs/common");
const job_descriptions_repository_1 = require("./job-descriptions.repository");
const job_descriptions_import_parser_1 = require("./job-descriptions-import.parser");
let JobDescriptionsService = JobDescriptionsService_1 = class JobDescriptionsService {
    repository;
    logger = new common_1.Logger(JobDescriptionsService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    list(searchInput, pageInput, pageSizeInput) {
        const search = searchInput?.trim() ?? '';
        if (search.length > 200)
            throw new common_1.BadRequestException('Search must not exceed 200 characters.');
        const page = this.positiveInteger(pageInput, 1, 1_000_000);
        const pageSize = this.positiveInteger(pageSizeInput, 8, 100);
        return this.runDatabaseOperation(() => this.repository.list(search, page, pageSize), 'Unable to load job descriptions');
    }
    create(body, actorAccountId) {
        const input = this.validateInput(body);
        return this.runDatabaseOperation(() => this.repository.create(input, actorAccountId), 'Unable to create job description');
    }
    importCsv(file, actorAccountId) {
        if (!file)
            throw new common_1.BadRequestException('A CSV file is required.');
        let inputs;
        try {
            inputs = (0, job_descriptions_import_parser_1.parseJobDescriptionsCsv)(file);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.BadRequestException('The uploaded CSV could not be parsed.');
        }
        return this.runDatabaseOperation(() => this.repository.importCsv(inputs, file.originalname, actorAccountId), 'Unable to import job descriptions');
    }
    async update(idInput, body, actorAccountId) {
        const id = this.validateId(idInput);
        const input = this.validateInput(body);
        return this.runDatabaseOperation(async () => {
            const updated = await this.repository.update(id, input, actorAccountId);
            if (!updated)
                throw new common_1.NotFoundException('Job description was not found.');
            return updated;
        }, 'Unable to update job description');
    }
    async delete(idInput, actorAccountId) {
        const id = this.validateId(idInput);
        await this.runDatabaseOperation(async () => {
            if (!(await this.repository.delete(id, actorAccountId))) {
                throw new common_1.NotFoundException('Job description was not found.');
            }
        }, 'Unable to delete job description');
    }
    validateId(value) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
            throw new common_1.BadRequestException('Job description ID is invalid.');
        }
        return value;
    }
    validateInput(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new common_1.BadRequestException('JD ID and Role Title are required.');
        }
        const record = value;
        const keys = Object.keys(record);
        if (keys.length !== 2 || keys.some((key) => key !== 'jdId' && key !== 'roleTitle')) {
            throw new common_1.BadRequestException('Job description must contain JD ID and Role Title.');
        }
        if (typeof record.jdId !== 'string' || typeof record.roleTitle !== 'string') {
            throw new common_1.BadRequestException('JD ID and Role Title must be text.');
        }
        const jdId = record.jdId.trim().toUpperCase();
        const roleTitle = record.roleTitle.trim();
        if (!jdId || !roleTitle)
            throw new common_1.BadRequestException('JD ID and Role Title are required.');
        if (jdId.length > 100)
            throw new common_1.BadRequestException('JD ID must not exceed 100 characters.');
        if (roleTitle.length > 200)
            throw new common_1.BadRequestException('Role Title must not exceed 200 characters.');
        return { jdId, roleTitle };
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
    async runDatabaseOperation(operation, publicMessage) {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            const code = error?.code;
            if (code === '23505')
                throw new common_1.ConflictException('This JD ID already exists.');
            if (code === '23503') {
                throw new common_1.ConflictException('This job description is assigned to an employee and cannot be deleted.');
            }
            this.logger.error(publicMessage);
            throw new common_1.InternalServerErrorException(publicMessage);
        }
    }
};
exports.JobDescriptionsService = JobDescriptionsService;
exports.JobDescriptionsService = JobDescriptionsService = JobDescriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [job_descriptions_repository_1.JobDescriptionsRepository])
], JobDescriptionsService);
//# sourceMappingURL=job-descriptions.service.js.map