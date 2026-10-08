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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TalentPipelineResponseDto = exports.TalentPipelineFilterOptionsDto = exports.TalentPipelineChartsDto = exports.TalentPipelineDistributionDto = exports.TalentPipelineChartDatumDto = exports.TalentPipelineKpisDto = exports.TalentPoolExpiringDto = exports.TalentPipelineKpiValueDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class TalentPipelineKpiValueDto {
    value;
    percentage;
}
exports.TalentPipelineKpiValueDto = TalentPipelineKpiValueDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TalentPipelineKpiValueDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Number, nullable: true }),
    __metadata("design:type", Object)
], TalentPipelineKpiValueDto.prototype, "percentage", void 0);
class TalentPoolExpiringDto {
    within6Months;
    within12Months;
}
exports.TalentPoolExpiringDto = TalentPoolExpiringDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TalentPoolExpiringDto.prototype, "within6Months", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TalentPoolExpiringDto.prototype, "within12Months", void 0);
class TalentPipelineKpisDto {
    totalTalentPool;
    activeTalentPool;
    passiveTalentPool;
    developmentPool;
    femaleTalent;
    keyToRetain;
    futureTalent;
    changeWanted;
    talentPoolExpiring;
}
exports.TalentPipelineKpisDto = TalentPipelineKpisDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpiValueDto }),
    __metadata("design:type", TalentPipelineKpiValueDto)
], TalentPipelineKpisDto.prototype, "totalTalentPool", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpiValueDto }),
    __metadata("design:type", TalentPipelineKpiValueDto)
], TalentPipelineKpisDto.prototype, "activeTalentPool", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpiValueDto }),
    __metadata("design:type", TalentPipelineKpiValueDto)
], TalentPipelineKpisDto.prototype, "passiveTalentPool", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpiValueDto }),
    __metadata("design:type", TalentPipelineKpiValueDto)
], TalentPipelineKpisDto.prototype, "developmentPool", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpiValueDto }),
    __metadata("design:type", TalentPipelineKpiValueDto)
], TalentPipelineKpisDto.prototype, "femaleTalent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpiValueDto }),
    __metadata("design:type", TalentPipelineKpiValueDto)
], TalentPipelineKpisDto.prototype, "keyToRetain", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpiValueDto }),
    __metadata("design:type", TalentPipelineKpiValueDto)
], TalentPipelineKpisDto.prototype, "futureTalent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpiValueDto }),
    __metadata("design:type", TalentPipelineKpiValueDto)
], TalentPipelineKpisDto.prototype, "changeWanted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPoolExpiringDto }),
    __metadata("design:type", TalentPoolExpiringDto)
], TalentPipelineKpisDto.prototype, "talentPoolExpiring", void 0);
class TalentPipelineChartDatumDto {
    label;
    value;
    percentage;
}
exports.TalentPipelineChartDatumDto = TalentPipelineChartDatumDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TalentPipelineChartDatumDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TalentPipelineChartDatumDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Number, nullable: true }),
    __metadata("design:type", Object)
], TalentPipelineChartDatumDto.prototype, "percentage", void 0);
class TalentPipelineDistributionDto {
    data;
}
exports.TalentPipelineDistributionDto = TalentPipelineDistributionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [TalentPipelineChartDatumDto] }),
    __metadata("design:type", Array)
], TalentPipelineDistributionDto.prototype, "data", void 0);
class TalentPipelineChartsDto {
    nominationYear;
    talentPoolDistribution;
    activePassiveDistribution;
    nominationStatusDistribution;
    developmentPoolDistribution;
    talentGenderDistribution;
    talentRangeDistribution;
}
exports.TalentPipelineChartsDto = TalentPipelineChartsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: Number, nullable: true }),
    __metadata("design:type", Object)
], TalentPipelineChartsDto.prototype, "nominationYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineDistributionDto }),
    __metadata("design:type", TalentPipelineDistributionDto)
], TalentPipelineChartsDto.prototype, "talentPoolDistribution", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineDistributionDto }),
    __metadata("design:type", TalentPipelineDistributionDto)
], TalentPipelineChartsDto.prototype, "activePassiveDistribution", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineDistributionDto }),
    __metadata("design:type", TalentPipelineDistributionDto)
], TalentPipelineChartsDto.prototype, "nominationStatusDistribution", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineDistributionDto }),
    __metadata("design:type", TalentPipelineDistributionDto)
], TalentPipelineChartsDto.prototype, "developmentPoolDistribution", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineDistributionDto }),
    __metadata("design:type", TalentPipelineDistributionDto)
], TalentPipelineChartsDto.prototype, "talentGenderDistribution", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineDistributionDto }),
    __metadata("design:type", TalentPipelineDistributionDto)
], TalentPipelineChartsDto.prototype, "talentRangeDistribution", void 0);
class TalentPipelineFilterOptionsDto {
    functionName;
    orgUnit;
    range;
    location;
    gender;
    directOrIndirect;
}
exports.TalentPipelineFilterOptionsDto = TalentPipelineFilterOptionsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], TalentPipelineFilterOptionsDto.prototype, "functionName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], TalentPipelineFilterOptionsDto.prototype, "orgUnit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], TalentPipelineFilterOptionsDto.prototype, "range", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], TalentPipelineFilterOptionsDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], TalentPipelineFilterOptionsDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], TalentPipelineFilterOptionsDto.prototype, "directOrIndirect", void 0);
class TalentPipelineResponseDto {
    asOfDate;
    workforceHeadcount;
    kpis;
    charts;
    filterOptions;
}
exports.TalentPipelineResponseDto = TalentPipelineResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date' }),
    __metadata("design:type", String)
], TalentPipelineResponseDto.prototype, "asOfDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Number, nullable: true }),
    __metadata("design:type", Object)
], TalentPipelineResponseDto.prototype, "workforceHeadcount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineKpisDto }),
    __metadata("design:type", TalentPipelineKpisDto)
], TalentPipelineResponseDto.prototype, "kpis", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineChartsDto }),
    __metadata("design:type", TalentPipelineChartsDto)
], TalentPipelineResponseDto.prototype, "charts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: TalentPipelineFilterOptionsDto }),
    __metadata("design:type", TalentPipelineFilterOptionsDto)
], TalentPipelineResponseDto.prototype, "filterOptions", void 0);
//# sourceMappingURL=talent-pipeline-response.dto.js.map