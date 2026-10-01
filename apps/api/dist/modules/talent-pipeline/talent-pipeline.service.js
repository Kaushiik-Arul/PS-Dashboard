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
            this.logger.error('Talent Pipeline database query failed');
            throw new common_1.InternalServerErrorException('Unable to load the Talent Pipeline dashboard');
        }
    }
    normalizeFilters(filters) {
        const normalize = (value, label) => {
            if (value === undefined || value === '')
                return null;
            if (typeof value !== 'string' || value.length > 200)
                throw new common_1.BadRequestException(`${label} filter is invalid`);
            return value.trim() || null;
        };
        return {
            functionName: normalize(filters.functionName, 'Function'),
            orgUnit: normalize(filters.orgUnit, 'Organizational unit'),
            range: normalize(filters.range, 'Range'),
            location: normalize(filters.location, 'Location'),
            gender: normalize(filters.gender, 'Gender'),
            directOrIndirect: normalize(filters.directOrIndirect, 'Direct or indirect'),
        };
    }
};
exports.TalentPipelineService = TalentPipelineService;
exports.TalentPipelineService = TalentPipelineService = TalentPipelineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [talent_pipeline_repository_1.TalentPipelineRepository])
], TalentPipelineService);
//# sourceMappingURL=talent-pipeline.service.js.map