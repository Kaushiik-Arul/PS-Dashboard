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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Employee360Controller = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const employee_360_service_1 = require("./employee-360.service");
const employee_360_dto_1 = require("./dto/employee-360.dto");
let Employee360Controller = class Employee360Controller {
    service;
    constructor(service) {
        this.service = service;
    }
    getEmployees(query, user) {
        return this.service.getEmployees(query, user);
    }
    getProfile(persNo, user) {
        return this.service.getProfile(persNo, user);
    }
    createCareerEvent(persNo, body, user) {
        return this.service.createCareerEvent(persNo, body, user);
    }
    updateJobDescription(persNo, body, user) {
        return this.service.updateJobDescription(persNo, body, user);
    }
    updateCareerEvent(persNo, eventId, body, user) {
        return this.service.updateCareerEvent(persNo, eventId, body, user);
    }
    deleteCareerEvent(persNo, eventId, user) {
        return this.service.deleteCareerEvent(persNo, eventId, user);
    }
};
exports.Employee360Controller = Employee360Controller;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'List employees within the authenticated workforce scope' }),
    (0, swagger_1.ApiOkResponse)({ type: employee_360_dto_1.Employee360ResponseDto }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_360_dto_1.Employee360QueryDto, Object]),
    __metadata("design:returntype", Promise)
], Employee360Controller.prototype, "getEmployees", null);
__decorate([
    (0, common_1.Get)(':persNo'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Get an employee profile and Career Journey within the authenticated workforce scope' }),
    __param(0, (0, common_1.Param)('persNo')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], Employee360Controller.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)(':persNo/career-journey'),
    (0, require_permission_decorator_1.RequirePermission)('workforce:edit'),
    __param(0, (0, common_1.Param)('persNo')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], Employee360Controller.prototype, "createCareerEvent", null);
__decorate([
    (0, common_1.Patch)(':persNo/job-description'),
    (0, require_permission_decorator_1.RequirePermission)('workforce:edit'),
    __param(0, (0, common_1.Param)('persNo')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], Employee360Controller.prototype, "updateJobDescription", null);
__decorate([
    (0, common_1.Patch)(':persNo/career-journey/:eventId'),
    (0, require_permission_decorator_1.RequirePermission)('workforce:edit'),
    __param(0, (0, common_1.Param)('persNo')),
    __param(1, (0, common_1.Param)('eventId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], Employee360Controller.prototype, "updateCareerEvent", null);
__decorate([
    (0, common_1.Delete)(':persNo/career-journey/:eventId'),
    (0, require_permission_decorator_1.RequirePermission)('workforce:edit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('persNo')),
    __param(1, (0, common_1.Param)('eventId')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], Employee360Controller.prototype, "deleteCareerEvent", null);
exports.Employee360Controller = Employee360Controller = __decorate([
    (0, swagger_1.ApiTags)('Employee 360'),
    (0, common_1.Controller)('employee-360'),
    (0, require_permission_decorator_1.RequirePermission)('workforce:view'),
    __metadata("design:paramtypes", [employee_360_service_1.Employee360Service])
], Employee360Controller);
//# sourceMappingURL=employee-360.controller.js.map