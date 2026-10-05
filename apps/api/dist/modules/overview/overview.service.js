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
var OverviewService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewService = void 0;
const common_1 = require("@nestjs/common");
const overview_repository_1 = require("./overview.repository");
let OverviewService = OverviewService_1 = class OverviewService {
    repository;
    logger = new common_1.Logger(OverviewService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async getAvailableMonths() {
        try {
            return await this.repository.getAvailableMonths();
        }
        catch (error) {
            this.logger.error('Overview available months query failed', error instanceof Error ? error.stack : String(error));
            throw new common_1.InternalServerErrorException('Unable to load available reporting months');
        }
    }
    async getArchivedMonths() {
        try {
            return await this.repository.getArchivedMonths();
        }
        catch (error) {
            this.logger.error('Overview archived months query failed', error instanceof Error ? error.stack : String(error));
            throw new common_1.InternalServerErrorException('Unable to load archived reporting months');
        }
    }
    async getArchivedOverview(reportingMonthInput) {
        const reportingMonth = this.normalizeReportingMonth(reportingMonthInput);
        if (!reportingMonth)
            throw new common_1.BadRequestException('Reporting month is required');
        try {
            const overview = await this.repository.getArchivedOverview(reportingMonth);
            if (!overview)
                throw new common_1.NotFoundException('Archived Overview month was not found');
            return overview;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.logger.error('Archived Overview query failed', error instanceof Error ? error.stack : String(error));
            throw new common_1.InternalServerErrorException('Unable to load archived workforce overview');
        }
    }
    async getOverview(filters, accountId) {
        const normalizedFilters = this.normalizeFilters(filters);
        try {
            return await this.repository.getOverview(normalizedFilters, accountId);
        }
        catch (error) {
            this.logger.error('Overview database query failed', error instanceof Error ? error.stack : String(error));
            throw new common_1.InternalServerErrorException('Unable to load the workforce overview');
        }
    }
    normalizeFilters(filters) {
        const normalize = (value, label) => {
            if (value === undefined || value === '')
                return null;
            if (typeof value !== 'string' || value.length > 200) {
                throw new common_1.BadRequestException(`${label} filter is invalid`);
            }
            return value.trim() || null;
        };
        return {
            reportingMonth: this.normalizeReportingMonth(filters.reportingMonth),
            functionName: normalize(filters.functionName, 'Function'),
            orgUnit: normalize(filters.orgUnit, 'Organizational unit'),
            range: normalize(filters.range, 'Range'),
            location: normalize(filters.location, 'Location'),
            gender: normalize(filters.gender, 'Gender'),
            directOrIndirect: normalize(filters.directOrIndirect, 'Direct or indirect'),
        };
    }
    normalizeReportingMonth(value) {
        if (value === undefined || value === '')
            return null;
        if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
            throw new common_1.BadRequestException('Reporting month must use YYYY-MM format');
        }
        const currentMonth = new Date().toISOString().slice(0, 7);
        if (value >= currentMonth) {
            throw new common_1.BadRequestException('Historical reporting month must be earlier than the current month');
        }
        return `${value}-01`;
    }
};
exports.OverviewService = OverviewService;
exports.OverviewService = OverviewService = OverviewService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [overview_repository_1.OverviewRepository])
], OverviewService);
//# sourceMappingURL=overview.service.js.map