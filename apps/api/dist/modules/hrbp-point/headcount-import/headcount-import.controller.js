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
exports.HeadcountImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const headcount_import_service_1 = require("./headcount-import.service");
let HeadcountImportController = class HeadcountImportController {
    service;
    constructor(service) {
        this.service = service;
    }
    createPreview(file, user) {
        return this.service.createPreview(file, user.accountId);
    }
    getPreview(previewId, user) {
        return this.service.getPreview(previewId, user.accountId);
    }
    cancel(previewId, user) {
        return this.service.cancel(previewId, user.accountId);
    }
    commit(previewId, confirmReplacement, user) {
        return this.service.commit(previewId, confirmReplacement, user.accountId);
    }
};
exports.HeadcountImportController = HeadcountImportController;
__decorate([
    (0, common_1.Post)('previews'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate monthly headcounts from a multi-sheet PS Namelist workbook' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HeadcountImportController.prototype, "createPreview", null);
__decorate([
    (0, common_1.Get)('previews/:previewId'),
    __param(0, (0, common_1.Param)('previewId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HeadcountImportController.prototype, "getPreview", null);
__decorate([
    (0, common_1.Delete)('previews/:previewId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('previewId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HeadcountImportController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('previews/:previewId/commit'),
    __param(0, (0, common_1.Param)('previewId')),
    __param(1, (0, common_1.Body)('confirmReplacement')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], HeadcountImportController.prototype, "commit", null);
exports.HeadcountImportController = HeadcountImportController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point - Monthly Headcount Imports'),
    (0, common_1.Controller)('hrbp-point/headcount-imports'),
    (0, require_permission_decorator_1.RequirePermission)('headcount:import'),
    __metadata("design:paramtypes", [headcount_import_service_1.HeadcountImportService])
], HeadcountImportController);
//# sourceMappingURL=headcount-import.controller.js.map