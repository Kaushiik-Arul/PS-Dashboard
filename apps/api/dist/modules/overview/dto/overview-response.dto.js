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
exports.OverviewResponseDto = exports.OverviewChartsDto = exports.RetirementRiskRowDto = exports.DistributionChartDto = exports.ChartDatumDto = exports.OverviewKpisDto = exports.KpiValueDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class KpiValueDto {
    value;
    unit;
}
exports.KpiValueDto = KpiValueDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: Number, nullable: true }),
    __metadata("design:type", Object)
], KpiValueDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Display unit returned by the KPI' }),
    __metadata("design:type", String)
], KpiValueDto.prototype, "unit", void 0);
class OverviewKpisDto {
    totalHeadcount;
    directHeadcount;
    indirectHeadcount;
    femalePercentage;
    averageAge;
    averageTenure;
    retirementWithinThreeYears;
    maternity;
    sabbatical;
    crl;
}
exports.OverviewKpisDto = OverviewKpisDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "totalHeadcount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "directHeadcount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "indirectHeadcount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "femalePercentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "averageAge", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "averageTenure", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "retirementWithinThreeYears", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "maternity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "sabbatical", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: KpiValueDto }),
    __metadata("design:type", KpiValueDto)
], OverviewKpisDto.prototype, "crl", void 0);
class ChartDatumDto {
    label;
    value;
    percentage;
}
exports.ChartDatumDto = ChartDatumDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ChartDatumDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ChartDatumDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Number, nullable: true }),
    __metadata("design:type", Object)
], ChartDatumDto.prototype, "percentage", void 0);
class DistributionChartDto {
    data;
}
exports.DistributionChartDto = DistributionChartDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ChartDatumDto] }),
    __metadata("design:type", Array)
], DistributionChartDto.prototype, "data", void 0);
class RetirementRiskRowDto {
    functionName;
    oneYear;
    threeYears;
    fiveYears;
}
exports.RetirementRiskRowDto = RetirementRiskRowDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RetirementRiskRowDto.prototype, "functionName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RetirementRiskRowDto.prototype, "oneYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RetirementRiskRowDto.prototype, "threeYears", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], RetirementRiskRowDto.prototype, "fiveYears", void 0);
class OverviewChartsDto {
    headcountByPsGroup;
    genderDistribution;
    headcountByFunction;
    headcountByLocation;
    ageProfile;
    tenureProfile;
    retirementRisk;
    workforceMovement;
}
exports.OverviewChartsDto = OverviewChartsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: DistributionChartDto }),
    __metadata("design:type", DistributionChartDto)
], OverviewChartsDto.prototype, "headcountByPsGroup", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DistributionChartDto }),
    __metadata("design:type", DistributionChartDto)
], OverviewChartsDto.prototype, "genderDistribution", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DistributionChartDto }),
    __metadata("design:type", DistributionChartDto)
], OverviewChartsDto.prototype, "headcountByFunction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DistributionChartDto }),
    __metadata("design:type", DistributionChartDto)
], OverviewChartsDto.prototype, "headcountByLocation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DistributionChartDto }),
    __metadata("design:type", DistributionChartDto)
], OverviewChartsDto.prototype, "ageProfile", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DistributionChartDto }),
    __metadata("design:type", DistributionChartDto)
], OverviewChartsDto.prototype, "tenureProfile", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [RetirementRiskRowDto] }),
    __metadata("design:type", Array)
], OverviewChartsDto.prototype, "retirementRisk", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DistributionChartDto }),
    __metadata("design:type", DistributionChartDto)
], OverviewChartsDto.prototype, "workforceMovement", void 0);
class OverviewResponseDto {
    asOfDate;
    kpis;
    charts;
}
exports.OverviewResponseDto = OverviewResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date' }),
    __metadata("design:type", String)
], OverviewResponseDto.prototype, "asOfDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: OverviewKpisDto }),
    __metadata("design:type", OverviewKpisDto)
], OverviewResponseDto.prototype, "kpis", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: OverviewChartsDto }),
    __metadata("design:type", OverviewChartsDto)
], OverviewResponseDto.prototype, "charts", void 0);
//# sourceMappingURL=overview-response.dto.js.map