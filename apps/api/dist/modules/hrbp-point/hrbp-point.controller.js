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
exports.HrbpPointController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const employee_status_dto_1 = require("./dto/employee-status.dto");
const hrbp_point_service_1 = require("./hrbp-point.service");
let HrbpPointController = class HrbpPointController {
    service;
    constructor(service) {
        this.service = service;
    }
    getEmployeeStatuses() {
        return this.service.getEmployeeStatuses();
    }
    createEmployeeStatus(input, user) {
        return this.service.createEmployeeStatus(input, user.accountId);
    }
    updateEmployeeStatus(persNo, input, user) {
        return this.service.updateEmployeeStatus(persNo, input, user.accountId);
    }
    deleteEmployeeStatus(persNo) {
        return this.service.deleteEmployeeStatus(persNo);
    }
};
exports.HrbpPointController = HrbpPointController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'List employee leave statuses' }),
    (0, swagger_1.ApiOkResponse)({ type: [employee_status_dto_1.EmployeeStatusResponseDto] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HrbpPointController.prototype, "getEmployeeStatuses", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create an employee leave status' }),
    (0, swagger_1.ApiCreatedResponse)({ type: employee_status_dto_1.EmployeeStatusResponseDto }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Employee number was not found' }),
    (0, swagger_1.ApiConflictResponse)({ description: 'Employee status already exists' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [employee_status_dto_1.CreateEmployeeStatusDto, Object]),
    __metadata("design:returntype", Promise)
], HrbpPointController.prototype, "createEmployeeStatus", null);
__decorate([
    (0, common_1.Patch)(':persNo'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an employee leave status' }),
    (0, swagger_1.ApiOkResponse)({ type: employee_status_dto_1.EmployeeStatusResponseDto }),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Employee status was not found' }),
    __param(0, (0, common_1.Param)('persNo')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, employee_status_dto_1.UpdateEmployeeStatusDto, Object]),
    __metadata("design:returntype", Promise)
], HrbpPointController.prototype, "updateEmployeeStatus", null);
__decorate([
    (0, common_1.Delete)(':persNo'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an employee leave status' }),
    (0, swagger_1.ApiNoContentResponse)(),
    (0, swagger_1.ApiNotFoundResponse)({ description: 'Employee status was not found' }),
    __param(0, (0, common_1.Param)('persNo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HrbpPointController.prototype, "deleteEmployeeStatus", null);
exports.HrbpPointController = HrbpPointController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point'),
    (0, common_1.Controller)('hrbp-point/employee-statuses'),
    (0, require_permission_decorator_1.RequirePermission)('hrbp-point:view'),
    __metadata("design:paramtypes", [hrbp_point_service_1.HrbpPointService])
], HrbpPointController);
//# sourceMappingURL=hrbp-point.controller.js.map