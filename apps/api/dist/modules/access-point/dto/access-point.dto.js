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
exports.UpdateAccessAssignmentDto = exports.CreateAccessAssignmentDto = exports.AccessAssignmentDto = exports.EmployeeCandidateDto = exports.managedRoles = void 0;
const swagger_1 = require("@nestjs/swagger");
exports.managedRoles = [
    'admin',
    'range_head',
    'department_head',
    'sub_department_head',
];
class EmployeeCandidateDto {
    persNo;
    employeeName;
    email;
    range;
    orgUnit;
    designation;
    hasAccount;
}
exports.EmployeeCandidateDto = EmployeeCandidateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '12345678' }),
    __metadata("design:type", String)
], EmployeeCandidateDto.prototype, "persNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Jane Doe' }),
    __metadata("design:type", String)
], EmployeeCandidateDto.prototype, "employeeName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'jane.doe@bosch.com', nullable: true }),
    __metadata("design:type", Object)
], EmployeeCandidateDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], EmployeeCandidateDto.prototype, "range", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], EmployeeCandidateDto.prototype, "orgUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], EmployeeCandidateDto.prototype, "designation", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], EmployeeCandidateDto.prototype, "hasAccount", void 0);
class AccessAssignmentDto {
    assignmentId;
    accountId;
    persNo;
    employeeName;
    email;
    accountStatus;
    mustChangePassword;
    role;
    assignedRange;
    assignedOrgUnit;
    updatedAt;
}
exports.AccessAssignmentDto = AccessAssignmentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccessAssignmentDto.prototype, "assignmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccessAssignmentDto.prototype, "accountId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '12345678' }),
    __metadata("design:type", String)
], AccessAssignmentDto.prototype, "persNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccessAssignmentDto.prototype, "employeeName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], AccessAssignmentDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['active', 'inactive'] }),
    __metadata("design:type", String)
], AccessAssignmentDto.prototype, "accountStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], AccessAssignmentDto.prototype, "mustChangePassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.managedRoles }),
    __metadata("design:type", String)
], AccessAssignmentDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], AccessAssignmentDto.prototype, "assignedRange", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], AccessAssignmentDto.prototype, "assignedOrgUnit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], AccessAssignmentDto.prototype, "updatedAt", void 0);
class CreateAccessAssignmentDto {
    persNo;
    role;
    assignedRange;
    assignedOrgUnit;
    temporaryPassword;
}
exports.CreateAccessAssignmentDto = CreateAccessAssignmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '12345678' }),
    __metadata("design:type", String)
], CreateAccessAssignmentDto.prototype, "persNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.managedRoles }),
    __metadata("design:type", String)
], CreateAccessAssignmentDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], CreateAccessAssignmentDto.prototype, "assignedRange", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], CreateAccessAssignmentDto.prototype, "assignedOrgUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minLength: 12, description: 'Required for a new account' }),
    __metadata("design:type", String)
], CreateAccessAssignmentDto.prototype, "temporaryPassword", void 0);
class UpdateAccessAssignmentDto {
    role;
    assignedRange;
    assignedOrgUnit;
}
exports.UpdateAccessAssignmentDto = UpdateAccessAssignmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: exports.managedRoles }),
    __metadata("design:type", String)
], UpdateAccessAssignmentDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], UpdateAccessAssignmentDto.prototype, "assignedRange", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], UpdateAccessAssignmentDto.prototype, "assignedOrgUnit", void 0);
//# sourceMappingURL=access-point.dto.js.map