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
exports.ActiveStepController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const active_step_service_1 = require("./active-step.service");
let ActiveStepController = class ActiveStepController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(actor) { return this.service.list(actor.accountId); }
    createPreview(file, actor) {
        return this.service.createPreview(file, actor.accountId);
    }
    getRows(id, filter, page, actor) {
        return this.service.getRows(id, actor.accountId, filter, page);
    }
    updateRow(id, rowNumber, values, actor) {
        return this.service.updateRow(id, rowNumber, values, actor.accountId);
    }
    deleteRow(id, rowNumber, actor) {
        return this.service.deleteRow(id, rowNumber, actor.accountId);
    }
    cancel(id, actor) { return this.service.cancel(id, actor.accountId); }
    commit(id, confirmation, actor) {
        return this.service.commit(id, confirmation, actor.accountId);
    }
};
exports.ActiveStepController = ActiveStepController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('workforce:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List current Active STEP rows' }),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ActiveStepController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('previews'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ActiveStepController.prototype, "createPreview", null);
__decorate([
    (0, common_1.Get)('previews/:id/rows'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('filter')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], ActiveStepController.prototype, "getRows", null);
__decorate([
    (0, common_1.Patch)('previews/:id/rows/:rowNumber'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('rowNumber')),
    __param(2, (0, common_1.Body)('values')),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ActiveStepController.prototype, "updateRow", null);
__decorate([
    (0, common_1.Delete)('previews/:id/rows/:rowNumber'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('rowNumber')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ActiveStepController.prototype, "deleteRow", null);
__decorate([
    (0, common_1.Delete)('previews/:id'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ActiveStepController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('previews/:id/commit'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('confirmReplacement')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ActiveStepController.prototype, "commit", null);
exports.ActiveStepController = ActiveStepController = __decorate([
    (0, swagger_1.ApiTags)('Active STEP'),
    (0, common_1.Controller)('hrbp-point/active-step'),
    __metadata("design:paramtypes", [active_step_service_1.ActiveStepService])
], ActiveStepController);
//# sourceMappingURL=active-step.controller.js.map