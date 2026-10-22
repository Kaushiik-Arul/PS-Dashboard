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
var OrgStructureImportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgStructureImportService = void 0;
const common_1 = require("@nestjs/common");
const org_structure_import_parser_1 = require("./org-structure-import.parser");
const org_structure_import_repository_1 = require("./org-structure-import.repository");
const org_structure_import_types_1 = require("./org-structure-import.types");
let OrgStructureImportService = OrgStructureImportService_1 = class OrgStructureImportService {
    repository;
    logger = new common_1.Logger(OrgStructureImportService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async createPreview(file, actor) {
        if (!file)
            throw new common_1.BadRequestException('Choose an org structure XLSX workbook.');
        if (file.buffer.length > 50 * 1024 * 1024)
            throw new common_1.BadRequestException('File exceeds 50 MB.');
        const rows = await (0, org_structure_import_parser_1.parseOrgStructureFile)(file);
        return this.run(() => this.repository.createPreview(file, rows, actor));
    }
    getRows(id, actor, page = '1') {
        this.validateId(id);
        if (!/^[1-9]\d*$/.test(page) || Number(page) > 1000)
            throw new common_1.BadRequestException('Invalid preview page.');
        return this.run(() => this.repository.getPreview(id, actor, Number(page)));
    }
    async updateRow(id, rowInput, input, actor) {
        this.validateId(id);
        const rowNumber = this.validateRowNumber(rowInput);
        const values = this.validateValues(input);
        await this.run(() => this.repository.updateRow(id, actor, rowNumber, values));
    }
    async deleteRow(id, rowInput, actor) {
        this.validateId(id);
        const rowNumber = this.validateRowNumber(rowInput);
        await this.run(() => this.repository.deleteRow(id, actor, rowNumber));
    }
    async cancel(id, actor) {
        this.validateId(id);
        if (!await this.run(() => this.repository.cancel(id, actor))) {
            throw new common_1.NotFoundException('Org structure preview was not found.');
        }
    }
    commit(id, confirmation, actor) {
        this.validateId(id);
        if (typeof confirmation !== 'boolean')
            throw new common_1.BadRequestException('Replacement confirmation must be a boolean.');
        return this.run(() => this.repository.commit(id, actor, confirmation));
    }
    list() {
        return this.run(() => this.repository.list());
    }
    validateId(id) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            throw new common_1.BadRequestException('Invalid org structure preview ID.');
        }
    }
    validateRowNumber(value) {
        if (!/^[1-9]\d*$/.test(value) || Number(value) > 2_147_483_647) {
            throw new common_1.BadRequestException('Invalid Excel row number.');
        }
        return Number(value);
    }
    validateValues(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new common_1.BadRequestException('Row values are required.');
        }
        const values = input;
        if (Object.keys(values).length !== org_structure_import_types_1.orgStructureColumns.length || org_structure_import_types_1.orgStructureColumns.some((key) => typeof values[key] !== 'string')) {
            throw new common_1.BadRequestException('Provide all org structure columns as text.');
        }
        return Object.fromEntries(org_structure_import_types_1.orgStructureColumns.map((key) => [key, values[key]]));
    }
    async run(work) {
        try {
            return await work();
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            if (error instanceof Error) {
                if (error.message === 'PREVIEW_NOT_FOUND')
                    throw new common_1.NotFoundException('Org structure preview expired or was not found.');
                if (error.message === 'ROW_NOT_FOUND')
                    throw new common_1.NotFoundException('Org structure preview row was not found.');
                if (error.message === 'LAST_PREVIEW_ROW')
                    throw new common_1.ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
                if (error.message === 'CONFIRM_REQUIRED')
                    throw new common_1.ConflictException('Confirm replacement of all org structure rows.');
                if (error.message === 'STALE_PREVIEW')
                    throw new common_1.ConflictException('A newer org structure was imported. Upload this workbook again.');
            }
            this.logger.error('Org structure request failed');
            throw new common_1.InternalServerErrorException('Unable to process org structure data.');
        }
    }
};
exports.OrgStructureImportService = OrgStructureImportService;
exports.OrgStructureImportService = OrgStructureImportService = OrgStructureImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [org_structure_import_repository_1.OrgStructureImportRepository])
], OrgStructureImportService);
//# sourceMappingURL=org-structure-import.service.js.map