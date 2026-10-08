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
exports.OverviewDetailsFilterDto = exports.OverviewFilterDto = exports.overviewDetailMetrics = void 0;
const swagger_1 = require("@nestjs/swagger");
exports.overviewDetailMetrics = [
    'total-hc',
    'direct-hc',
    'indirect-hc',
    'female-pct',
    'avg-age',
    'avg-tenure',
    'ret-3yrs',
    'maternity',
    'sabbatical',
    'crl',
];
class OverviewFilterDto {
    reportingMonth;
    functionName;
    orgUnit;
    range;
    location;
    gender;
    directOrIndirect;
}
exports.OverviewFilterDto = OverviewFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-09' }),
    __metadata("design:type", String)
], OverviewFilterDto.prototype, "reportingMonth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], OverviewFilterDto.prototype, "functionName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], OverviewFilterDto.prototype, "orgUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], OverviewFilterDto.prototype, "range", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], OverviewFilterDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], OverviewFilterDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], OverviewFilterDto.prototype, "directOrIndirect", void 0);
class OverviewDetailsFilterDto extends OverviewFilterDto {
    metric;
}
exports.OverviewDetailsFilterDto = OverviewDetailsFilterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.overviewDetailMetrics }),
    __metadata("design:type", String)
], OverviewDetailsFilterDto.prototype, "metric", void 0);
//# sourceMappingURL=overview-filter.dto.js.map