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
exports.UpdateEmployeeStatusDto = exports.CreateEmployeeStatusDto = exports.EmployeeStatusResponseDto = exports.employeeStatusTypes = void 0;
const swagger_1 = require("@nestjs/swagger");
exports.employeeStatusTypes = [
    'Maternity',
    'Sabbatical',
    'CRL',
    'Absconding',
];
class EmployeeStatusResponseDto {
    persNo;
    statusType;
    startDate;
    endDate;
    updatedAt;
    updatedBy;
}
exports.EmployeeStatusResponseDto = EmployeeStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '12345678' }),
    __metadata("design:type", String)
], EmployeeStatusResponseDto.prototype, "persNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.employeeStatusTypes }),
    __metadata("design:type", String)
], EmployeeStatusResponseDto.prototype, "statusType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date', nullable: true }),
    __metadata("design:type", Object)
], EmployeeStatusResponseDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date', nullable: true }),
    __metadata("design:type", Object)
], EmployeeStatusResponseDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], EmployeeStatusResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'hrbp' }),
    __metadata("design:type", String)
], EmployeeStatusResponseDto.prototype, "updatedBy", void 0);
class CreateEmployeeStatusDto {
    persNo;
    statusType;
    startDate;
    endDate;
    updatedBy;
}
exports.CreateEmployeeStatusDto = CreateEmployeeStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '12345678' }),
    __metadata("design:type", String)
], CreateEmployeeStatusDto.prototype, "persNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.employeeStatusTypes }),
    __metadata("design:type", String)
], CreateEmployeeStatusDto.prototype, "statusType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date', nullable: true }),
    __metadata("design:type", Object)
], CreateEmployeeStatusDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date', nullable: true }),
    __metadata("design:type", Object)
], CreateEmployeeStatusDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'hrbp' }),
    __metadata("design:type", String)
], CreateEmployeeStatusDto.prototype, "updatedBy", void 0);
class UpdateEmployeeStatusDto {
    statusType;
    startDate;
    endDate;
    updatedBy;
}
exports.UpdateEmployeeStatusDto = UpdateEmployeeStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.employeeStatusTypes }),
    __metadata("design:type", String)
], UpdateEmployeeStatusDto.prototype, "statusType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date', nullable: true }),
    __metadata("design:type", Object)
], UpdateEmployeeStatusDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: String, format: 'date', nullable: true }),
    __metadata("design:type", Object)
], UpdateEmployeeStatusDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'hrbp' }),
    __metadata("design:type", String)
], UpdateEmployeeStatusDto.prototype, "updatedBy", void 0);
//# sourceMappingURL=employee-status.dto.js.map