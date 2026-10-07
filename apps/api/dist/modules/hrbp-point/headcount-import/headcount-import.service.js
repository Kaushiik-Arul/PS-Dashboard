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
var HeadcountImportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeadcountImportService = void 0;
const common_1 = require("@nestjs/common");
const headcount_import_parser_1 = require("./headcount-import.parser");
const headcount_import_repository_1 = require("./headcount-import.repository");
let HeadcountImportService = HeadcountImportService_1 = class HeadcountImportService {
    repository;
    logger = new common_1.Logger(HeadcountImportService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async createPreview(file, actorAccountId) {
        if (!file)
            throw new common_1.BadRequestException('An XLSX workbook is required.');
        if (!file.buffer.length)
            throw new common_1.BadRequestException('The uploaded workbook is empty.');
        let parsed;
        try {
            parsed = await (0, headcount_import_parser_1.parseHeadcountWorkbook)(file);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.BadRequestException('The uploaded workbook could not be parsed.');
        }
        return this.run(() => this.repository.createPreview(actorAccountId, file, parsed), 'Unable to create monthly headcount preview');
    }
    async getPreview(previewId, actorAccountId) {
        return this.run(async () => {
            const preview = await this.repository.getPreview(previewId, actorAccountId);
            if (!preview)
                throw new common_1.NotFoundException('Monthly headcount preview was not found or has expired.');
            return preview;
        }, 'Unable to load monthly headcount preview');
    }
    async cancel(previewId, actorAccountId) {
        await this.run(async () => {
            if (!(await this.repository.cancel(previewId, actorAccountId))) {
                throw new common_1.NotFoundException('Monthly headcount preview was not found or has expired.');
            }
        }, 'Unable to cancel monthly headcount preview');
    }
    async commit(previewId, confirmReplacement, actorAccountId) {
        if (typeof confirmReplacement !== 'boolean') {
            throw new common_1.BadRequestException('Replacement confirmation must be a boolean.');
        }
        return this.run(() => this.repository.commit(previewId, actorAccountId, confirmReplacement), 'Unable to import monthly headcount');
    }
    async run(operation, publicMessage) {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            if (error instanceof Error) {
                if (error.message === 'PREVIEW_NOT_FOUND') {
                    throw new common_1.NotFoundException('Monthly headcount preview was not found or has expired.');
                }
                if (error.message === 'INVALID_WORKBOOK') {
                    throw new common_1.ConflictException('Resolve all workbook validation errors before importing.');
                }
                if (error.message === 'REPLACEMENT_CONFIRMATION_REQUIRED') {
                    throw new common_1.ConflictException('Confirm replacement of the existing monthly headcount data.');
                }
            }
            this.logger.error(publicMessage);
            throw new common_1.InternalServerErrorException(publicMessage);
        }
    }
};
exports.HeadcountImportService = HeadcountImportService;
exports.HeadcountImportService = HeadcountImportService = HeadcountImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [headcount_import_repository_1.HeadcountImportRepository])
], HeadcountImportService);
//# sourceMappingURL=headcount-import.service.js.map