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
exports.PsExitImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const ps_exit_import_service_1 = require("./ps-exit-import.service");
let PsExitImportController = class PsExitImportController {
    service;
    constructor(service) {
        this.service = service;
    }
    upload(file, actor) {
        return this.service.upload(actor.accountId, file);
    }
    preview(id, filter, period, page, actor) {
        return this.service.preview(actor.accountId, id, filter, period, page);
    }
    edit(id, row, values, actor) {
        if (values === undefined)
            throw new common_1.BadRequestException('Row values are required.');
        return this.service.editPreview(actor.accountId, id, row, values);
    }
    deleteRow(id, row, actor) {
        return this.service.editPreview(actor.accountId, id, row);
    }
    cancel(id, actor) {
        return this.service.cancel(actor.accountId, id);
    }
    commit(id, confirmed, period, actor) {
        return this.service.commit(actor.accountId, id, confirmed, period);
    }
};
exports.PsExitImportController = PsExitImportController;
__decorate([
    (0, common_1.Post)('previews'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PsExitImportController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('previews/:id/rows'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('filter')),
    __param(2, (0, common_1.Query)('period')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PsExitImportController.prototype, "preview", null);
__decorate([
    (0, common_1.Patch)('previews/:id/rows/:row'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('row')),
    __param(2, (0, common_1.Body)('values')),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], PsExitImportController.prototype, "edit", null);
__decorate([
    (0, common_1.Delete)('previews/:id/rows/:row'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('row')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PsExitImportController.prototype, "deleteRow", null);
__decorate([
    (0, common_1.Delete)('previews/:id'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PsExitImportController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('previews/:id/commit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('confirmed')),
    __param(2, (0, common_1.Body)('period')),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PsExitImportController.prototype, "commit", null);
exports.PsExitImportController = PsExitImportController = __decorate([
    (0, swagger_1.ApiTags)('PS Exit Import'),
    (0, common_1.Controller)('hrbp-point/ps-exit'),
    (0, require_permission_decorator_1.RequirePermission)('attrition:import'),
    __metadata("design:paramtypes", [ps_exit_import_service_1.PsExitImportService])
], PsExitImportController);
//# sourceMappingURL=ps-exit-import.controller.js.map