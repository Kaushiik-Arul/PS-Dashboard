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
exports.AccessPointController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const access_point_service_1 = require("./access-point.service");
const access_point_dto_1 = require("./dto/access-point.dto");
function requestMetadata(request) {
    return {
        ipAddress: request.ip || null,
        userAgent: typeof request.headers['user-agent'] === 'string'
            ? request.headers['user-agent'].slice(0, 500)
            : null,
    };
}
let AccessPointController = class AccessPointController {
    service;
    constructor(service) {
        this.service = service;
    }
    searchEmployees(query) {
        return this.service.searchEmployees(query);
    }
    getScopeOptions(range) {
        return this.service.getScopeOptions(range);
    }
    listAssignments() {
        return this.service.listAssignments();
    }
    createAssignment(input, user, request) {
        return this.service.createAssignment(input, user.accountId, requestMetadata(request));
    }
    updateAssignment(assignmentId, input, user, request) {
        return this.service.updateAssignment(assignmentId, input, user.accountId, requestMetadata(request));
    }
    deactivateAccount(accountId, user, request) {
        return this.service.deactivateAccount(accountId, user.accountId, requestMetadata(request));
    }
};
exports.AccessPointController = AccessPointController;
__decorate([
    (0, common_1.Get)('employees'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, swagger_1.ApiOkResponse)({ type: [access_point_dto_1.EmployeeCandidateDto] }),
    __param(0, (0, common_1.Query)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccessPointController.prototype, "searchEmployees", null);
__decorate([
    (0, common_1.Get)('scope-options'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    __param(0, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccessPointController.prototype, "getScopeOptions", null);
__decorate([
    (0, common_1.Get)('assignments'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, swagger_1.ApiOkResponse)({ type: [access_point_dto_1.AccessAssignmentDto] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AccessPointController.prototype, "listAssignments", null);
__decorate([
    (0, common_1.Post)('assignments'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, swagger_1.ApiCreatedResponse)({ type: access_point_dto_1.AccessAssignmentDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [access_point_dto_1.CreateAccessAssignmentDto, Object, Object]),
    __metadata("design:returntype", void 0)
], AccessPointController.prototype, "createAssignment", null);
__decorate([
    (0, common_1.Patch)('assignments/:assignmentId'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, swagger_1.ApiOkResponse)({ type: access_point_dto_1.AccessAssignmentDto }),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, access_point_dto_1.UpdateAccessAssignmentDto, Object, Object]),
    __metadata("design:returntype", void 0)
], AccessPointController.prototype, "updateAssignment", null);
__decorate([
    (0, common_1.Delete)('accounts/:accountId'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiNoContentResponse)(),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AccessPointController.prototype, "deactivateAccount", null);
exports.AccessPointController = AccessPointController = __decorate([
    (0, swagger_1.ApiTags)('Access Point'),
    (0, common_1.Controller)('access-point'),
    (0, require_permission_decorator_1.RequirePermission)('access-point:manage'),
    __metadata("design:paramtypes", [access_point_service_1.AccessPointService])
], AccessPointController);
//# sourceMappingURL=access-point.controller.js.map