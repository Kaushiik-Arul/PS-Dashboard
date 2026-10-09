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
exports.SuccessionPlanningFilterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class SuccessionPlanningFilterDto {
    functionName;
    orgUnit;
    range;
    location;
    gender;
    directOrIndirect;
}
exports.SuccessionPlanningFilterDto = SuccessionPlanningFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    __metadata("design:type", Object)
], SuccessionPlanningFilterDto.prototype, "functionName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    __metadata("design:type", Object)
], SuccessionPlanningFilterDto.prototype, "orgUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    __metadata("design:type", Object)
], SuccessionPlanningFilterDto.prototype, "range", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    __metadata("design:type", Object)
], SuccessionPlanningFilterDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    __metadata("design:type", Object)
], SuccessionPlanningFilterDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String] }),
    __metadata("design:type", Object)
], SuccessionPlanningFilterDto.prototype, "directOrIndirect", void 0);
//# sourceMappingURL=succession-planning-filter.dto.js.map