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
exports.Employee360ResponseDto = exports.Employee360FilterOptionsDto = exports.Employee360RowDto = exports.Employee360QueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class Employee360QueryDto {
    search;
    functionName;
    orgUnit;
    range;
    location;
    gender;
    directOrIndirect;
}
exports.Employee360QueryDto = Employee360QueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Employee360QueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Employee360QueryDto.prototype, "functionName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Employee360QueryDto.prototype, "orgUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Employee360QueryDto.prototype, "range", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Employee360QueryDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Employee360QueryDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], Employee360QueryDto.prototype, "directOrIndirect", void 0);
class Employee360RowDto {
    persNo;
    personnelNumber;
    employeeGroup;
    psGroup;
    orgUnit;
    range;
    functionName;
    gender;
    location;
    ntId;
    globalId;
    costCenter;
    birthDate;
    joiningDate;
    entryForRetirement;
    designationText;
    hrbpGlobalId;
    hrbp2GlobalId;
    officialEmail;
    technicalEntryDate;
    directOrIndirect;
}
exports.Employee360RowDto = Employee360RowDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Employee360RowDto.prototype, "persNo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "personnelNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "employeeGroup", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "psGroup", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "orgUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "range", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "functionName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "ntId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "globalId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "costCenter", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "joiningDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "entryForRetirement", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "designationText", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "hrbpGlobalId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "hrbp2GlobalId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "officialEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "technicalEntryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], Employee360RowDto.prototype, "directOrIndirect", void 0);
class Employee360FilterOptionsDto {
    functionName;
    orgUnit;
    range;
    location;
    gender;
    directOrIndirect;
}
exports.Employee360FilterOptionsDto = Employee360FilterOptionsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], Employee360FilterOptionsDto.prototype, "functionName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], Employee360FilterOptionsDto.prototype, "orgUnit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], Employee360FilterOptionsDto.prototype, "range", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], Employee360FilterOptionsDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], Employee360FilterOptionsDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], Employee360FilterOptionsDto.prototype, "directOrIndirect", void 0);
class Employee360ResponseDto {
    employees;
    filterOptions;
}
exports.Employee360ResponseDto = Employee360ResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [Employee360RowDto] }),
    __metadata("design:type", Array)
], Employee360ResponseDto.prototype, "employees", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: Employee360FilterOptionsDto }),
    __metadata("design:type", Employee360FilterOptionsDto)
], Employee360ResponseDto.prototype, "filterOptions", void 0);
//# sourceMappingURL=employee-360.dto.js.map