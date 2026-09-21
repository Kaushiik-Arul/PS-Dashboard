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
exports.AccessPointService = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth/auth.service");
const access_point_repository_1 = require("./access-point.repository");
const access_point_dto_1 = require("./dto/access-point.dto");
let AccessPointService = class AccessPointService {
    repository;
    authService;
    constructor(repository, authService) {
        this.repository = repository;
        this.authService = authService;
    }
    searchEmployees(queryInput) {
        const query = typeof queryInput === 'string' ? queryInput.trim() : '';
        if (query.length < 2 || query.length > 100) {
            throw new common_1.BadRequestException('Enter at least 2 characters to search');
        }
        return this.repository.searchEmployees(query);
    }
    getScopeOptions(rangeInput) {
        const range = typeof rangeInput === 'string' && rangeInput.trim()
            ? rangeInput.trim()
            : null;
        return this.repository.getScopeOptions(range);
    }
    listAssignments() {
        return this.repository.listAssignments();
    }
    async createAssignment(input, actorAccountId, metadata) {
        const persNo = this.parsePersNo(input?.persNo);
        const values = await this.parseAssignment(input);
        const employee = await this.repository.getEmployee(persNo);
        if (!employee)
            throw new common_1.NotFoundException('Employee was not found in the namelist');
        if (!employee.email ||
            employee.email.length > 320 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
            throw new common_1.BadRequestException('The employee has no official email in the namelist');
        }
        let passwordHash = null;
        if (!employee.hasAccount) {
            passwordHash = await this.authService.hashTemporaryPassword(input.temporaryPassword);
        }
        try {
            return await this.repository.createAssignment(employee, values, passwordHash, actorAccountId, metadata);
        }
        catch (error) {
            this.translateWriteError(error);
        }
    }
    async updateAssignment(assignmentId, input, actorAccountId, metadata) {
        if (!this.isUuid(assignmentId)) {
            throw new common_1.BadRequestException('Assignment ID is invalid');
        }
        const values = await this.parseAssignment(input);
        try {
            const updated = await this.repository.updateAssignment(assignmentId, values, actorAccountId, metadata);
            if (!updated)
                throw new common_1.NotFoundException('Access assignment was not found');
            return updated;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            this.translateWriteError(error);
        }
    }
    async deactivateAccount(accountId, actorAccountId, metadata) {
        if (!this.isUuid(accountId))
            throw new common_1.BadRequestException('Account ID is invalid');
        if (accountId === actorAccountId) {
            throw new common_1.ForbiddenException('You cannot deactivate your own account');
        }
        if (!(await this.repository.deactivateAccount(accountId, actorAccountId, metadata))) {
            throw new common_1.NotFoundException('Active account was not found');
        }
    }
    async parseAssignment(input) {
        if (!input || !access_point_dto_1.managedRoles.includes(input.role)) {
            throw new common_1.BadRequestException('Role is invalid');
        }
        const role = input.role;
        const assignedRange = this.optionalText(input.assignedRange);
        const assignedOrgUnit = this.optionalText(input.assignedOrgUnit);
        if (role === 'admin') {
            if (assignedRange || assignedOrgUnit) {
                throw new common_1.BadRequestException('Admin access cannot have a Range or Org Unit');
            }
            return { role, assignedRange: null, assignedOrgUnit: null };
        }
        if (!assignedRange)
            throw new common_1.BadRequestException('Range is required for Head access');
        if (role === 'range_head' && assignedOrgUnit) {
            throw new common_1.BadRequestException('Range Head access cannot have an Org Unit');
        }
        if (role !== 'range_head' && !assignedOrgUnit) {
            throw new common_1.BadRequestException('Org Unit is required for this Head role');
        }
        if (!(await this.repository.scopeExists(assignedRange, assignedOrgUnit))) {
            throw new common_1.BadRequestException('The selected Range and Org Unit are not in the namelist');
        }
        return { role, assignedRange, assignedOrgUnit };
    }
    parsePersNo(value) {
        if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
            throw new common_1.BadRequestException('Personnel number is invalid');
        }
        return value;
    }
    optionalText(value) {
        if (value === undefined || value === null)
            return null;
        if (typeof value !== 'string')
            throw new common_1.BadRequestException('Scope value is invalid');
        const normalized = value.trim();
        if (normalized.length > 200)
            throw new common_1.BadRequestException('Scope value is too long');
        return normalized || null;
    }
    isUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }
    translateWriteError(error) {
        const message = error instanceof Error ? error.message : '';
        const databaseError = typeof error === 'object' && error !== null
            ? error
            : null;
        if (message === 'ACCOUNT_INACTIVE') {
            throw new common_1.ConflictException('The employee account is inactive');
        }
        if (message === 'INCOMPATIBLE_ACCESS') {
            throw new common_1.ConflictException('Unrestricted and Head access cannot be combined');
        }
        if (databaseError?.code === '23505' &&
            databaseError.constraint === 'auth_accounts_login_email_unique') {
            throw new common_1.ConflictException('The official email is already linked to another account');
        }
        if (message === 'DUPLICATE_ASSIGNMENT' || databaseError?.code === '23505') {
            throw new common_1.ConflictException('This access assignment already exists');
        }
        throw error;
    }
};
exports.AccessPointService = AccessPointService;
exports.AccessPointService = AccessPointService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [access_point_repository_1.AccessPointRepository,
        auth_service_1.AuthService])
], AccessPointService);
//# sourceMappingURL=access-point.service.js.map