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
var TalentPipelineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TalentPipelineService = void 0;
const common_1 = require("@nestjs/common");
const talent_pipeline_repository_1 = require("./talent-pipeline.repository");
let TalentPipelineService = TalentPipelineService_1 = class TalentPipelineService {
    repository;
    logger = new common_1.Logger(TalentPipelineService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async getTalentPipeline(filters, accountId) {
        const normalized = this.normalizeFilters(filters);
        try {
            return await this.repository.getTalentPipeline(normalized, accountId);
        }
        catch {
            this.logger.error('Talent Landscape database query failed');
            throw new common_1.InternalServerErrorException('Unable to load the Talent Landscape dashboard');
        }
    }
    async getHistoryState() {
        try {
            return await this.repository.getHistoryState();
        }
        catch (error) {
            this.logger.error('Talent Landscape history state query failed', error instanceof Error ? error.stack : String(error));
            throw new common_1.InternalServerErrorException('Unable to load Talent Landscape history');
        }
    }
    async getSnapshot(reportingMonthInput) {
        const reportingMonth = this.normalizeReportingMonth(reportingMonthInput);
        try {
            const snapshot = await this.repository.getSnapshot(reportingMonth);
            if (!snapshot)
                throw new common_1.NotFoundException('Talent Landscape snapshot was not found');
            return snapshot;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Talent Landscape snapshot query failed', error instanceof Error ? error.stack : String(error));
            throw new common_1.InternalServerErrorException('Unable to load Talent Landscape snapshot');
        }
    }
    async publishSnapshot(reportingMonthInput, accountId) {
        const reportingMonth = this.normalizeReportingMonth(reportingMonthInput);
        try {
            return { reportingMonth: await this.repository.publishSnapshot(accountId, reportingMonth) };
        }
        catch (error) {
            if (error instanceof Error && error.message === 'SNAPSHOT_VERIFICATION_FAILED') {
                throw new common_1.ConflictException('The Talent Landscape snapshot could not be verified.');
            }
            this.logger.error('Talent Landscape snapshot publication failed', error instanceof Error ? error.stack : String(error));
            throw new common_1.InternalServerErrorException('Unable to save Talent Landscape snapshot');
        }
    }
    normalizeReportingMonth(value) {
        if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
            throw new common_1.BadRequestException('Reporting month must use YYYY-MM format');
        }
        if (value >= new Date().toISOString().slice(0, 7)) {
            throw new common_1.BadRequestException('Historical reporting month must be earlier than the current month');
        }
        return `${value}-01`;
    }
    normalizeFilters(filters) {
        const normalizeMany = (value, label) => {
            if (value === undefined || value === '')
                return [];
            const values = Array.isArray(value) ? value : [value];
            if (values.some((item) => typeof item !== 'string' || item.length > 200))
                throw new common_1.BadRequestException(`${label} filter is invalid`);
            return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
        };
        return {
            functionName: normalizeMany(filters.functionName, 'Function'),
            orgUnit: normalizeMany(filters.orgUnit, 'Organizational unit'),
            range: normalizeMany(filters.range, 'Range'),
            location: normalizeMany(filters.location, 'Location'),
            gender: normalizeMany(filters.gender, 'Gender'),
            directOrIndirect: normalizeMany(filters.directOrIndirect, 'Direct or indirect'),
        };
    }
};
exports.TalentPipelineService = TalentPipelineService;
exports.TalentPipelineService = TalentPipelineService = TalentPipelineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [talent_pipeline_repository_1.TalentPipelineRepository])
], TalentPipelineService);
//# sourceMappingURL=talent-pipeline.service.js.map