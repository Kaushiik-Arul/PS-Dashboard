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
var ActiveStepService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveStepService = void 0;
const common_1 = require("@nestjs/common");
const active_step_repository_1 = require("./active-step.repository");
const active_step_parser_1 = require("./active-step.parser");
const active_step_types_1 = require("./active-step.types");
let ActiveStepService = ActiveStepService_1 = class ActiveStepService {
    repository;
    logger = new common_1.Logger(ActiveStepService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async createPreview(file, actor) {
        if (!file)
            throw new common_1.BadRequestException('Choose a STEP XLSX workbook.');
        if (file.buffer.length > 50 * 1024 * 1024)
            throw new common_1.BadRequestException('File exceeds 50 MB.');
        const rows = await (0, active_step_parser_1.parseStepFile)(file);
        return this.run(() => this.repository.createPreview(file, rows, actor));
    }
    getRows(id, actor, filter = 'all', page = '1') {
        this.validateId(id);
        if (!['all', 'valid', 'invalid'].includes(filter))
            throw new common_1.BadRequestException('Invalid preview filter.');
        if (!/^[1-9]\d*$/.test(page) || +page > 1000)
            throw new common_1.BadRequestException('Invalid preview page.');
        return this.run(() => this.repository.getPreview(id, actor, filter, +page));
    }
    async updateRow(id, rowInput, input, actor) {
        this.validateId(id);
        const rowNumber = this.validateRowNumber(rowInput);
        const values = this.validateValues(input);
        const issues = (0, active_step_parser_1.validateStepRow)(values);
        await this.run(() => this.repository.updateRow(id, actor, rowNumber, values, issues));
    }
    async deleteRow(id, rowInput, actor) {
        this.validateId(id);
        const rowNumber = this.validateRowNumber(rowInput);
        await this.run(() => this.repository.deleteRow(id, actor, rowNumber));
    }
    async cancel(id, actor) {
        this.validateId(id);
        if (!await this.run(() => this.repository.cancel(id, actor)))
            throw new common_1.NotFoundException('STEP preview was not found.');
    }
    commit(id, confirmation, actor) {
        this.validateId(id);
        if (typeof confirmation !== 'boolean')
            throw new common_1.BadRequestException('Replacement confirmation must be a boolean.');
        return this.run(() => this.repository.commit(id, actor, confirmation));
    }
    list(actor) { return this.run(() => this.repository.list(actor)); }
    validateId(id) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
            throw new common_1.BadRequestException('Invalid STEP preview ID.');
    }
    validateRowNumber(value) {
        if (!/^[1-9]\d*$/.test(value) || +value > 2_147_483_647)
            throw new common_1.BadRequestException('Invalid Excel row number.');
        return +value;
    }
    validateValues(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input))
            throw new common_1.BadRequestException('Row values are required.');
        const values = input;
        if (Object.keys(values).length !== active_step_types_1.stepColumns.length || active_step_types_1.stepColumns.some((key) => typeof values[key] !== 'string')) {
            throw new common_1.BadRequestException('Provide all STEP columns as text.');
        }
        const cleaned = Object.fromEntries(active_step_types_1.stepColumns.map((key) => [key, values[key].trim()]));
        for (const key of ['step_from', 'step_to'])
            cleaned[key] = (0, active_step_parser_1.parsedDate)(cleaned[key]) ?? cleaned[key];
        return cleaned;
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
                    throw new common_1.NotFoundException('STEP preview expired or was not found.');
                if (error.message === 'ROW_NOT_FOUND')
                    throw new common_1.NotFoundException('STEP preview row was not found.');
                if (error.message === 'INVALID_ROWS')
                    throw new common_1.ConflictException('Correct the invalid rows in Excel and upload it again.');
                if (error.message === 'STALE_PREVIEW')
                    throw new common_1.ConflictException('A newer STEP workbook was imported. Upload this workbook again.');
                if (error.message === 'STALE_EMPLOYEES')
                    throw new common_1.ConflictException('Employee data changed after preview. Upload the workbook again.');
                if (error.message === 'LAST_PREVIEW_ROW')
                    throw new common_1.ConflictException('The final preview row cannot be deleted. Cancel the preview instead.');
                if (error.message === 'CONFIRM_REQUIRED')
                    throw new common_1.ConflictException('Confirm replacement of all Active STEP rows.');
            }
            this.logger.error('Active STEP request failed');
            throw new common_1.InternalServerErrorException('Unable to process Active STEP data.');
        }
    }
};
exports.ActiveStepService = ActiveStepService;
exports.ActiveStepService = ActiveStepService = ActiveStepService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [active_step_repository_1.ActiveStepRepository])
], ActiveStepService);
//# sourceMappingURL=active-step.service.js.map