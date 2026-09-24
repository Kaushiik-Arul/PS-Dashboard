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
exports.RbinExceptionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const rbin_exceptions_service_1 = require("./rbin-exceptions.service");
let RbinExceptionsController = class RbinExceptionsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(search, filter, page, pageSize) {
        return this.service.list(search, filter, page, pageSize);
    }
    create(body, user) {
        return this.service.create(body, user.accountId);
    }
    update(exceptionId, body, user) {
        return this.service.update(exceptionId, body, user.accountId);
    }
    delete(exceptionId, user) {
        return this.service.delete(exceptionId, user.accountId);
    }
};
exports.RbinExceptionsController = RbinExceptionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Search, filter, and page RBIN employee exceptions' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('filter')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], RbinExceptionsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create RBIN employee exceptions for multiple columns' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RbinExceptionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':exceptionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an RBIN employee exception' }),
    __param(0, (0, common_1.Param)('exceptionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RbinExceptionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':exceptionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an RBIN employee exception' }),
    __param(0, (0, common_1.Param)('exceptionId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RbinExceptionsController.prototype, "delete", null);
exports.RbinExceptionsController = RbinExceptionsController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point - RBIN Exceptions'),
    (0, common_1.Controller)('hrbp-point/rbin-exceptions'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:transform'),
    __metadata("design:paramtypes", [rbin_exceptions_service_1.RbinExceptionsService])
], RbinExceptionsController);
//# sourceMappingURL=rbin-exceptions.controller.js.map