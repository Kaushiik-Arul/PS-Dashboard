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
exports.EmployeeJdImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const employee_jd_import_service_1 = require("./employee-jd-import.service");
let EmployeeJdImportController = class EmployeeJdImportController {
    service;
    constructor(service) {
        this.service = service;
    }
    createPreview(file, user) {
        return this.service.createPreview(file, user.accountId);
    }
    getRows(previewId, filter, page, pageSize, user) {
        return this.service.getRows(previewId, user.accountId, filter, page, pageSize);
    }
    updateRow(previewId, rowNumber, input, user) {
        return this.service.updateRow(previewId, rowNumber, input, user.accountId);
    }
    cancel(previewId, user) {
        return this.service.cancel(previewId, user.accountId);
    }
    commit(previewId, confirmReplacement, user) {
        return this.service.commit(previewId, confirmReplacement, user.accountId);
    }
};
exports.EmployeeJdImportController = EmployeeJdImportController;
__decorate([
    (0, common_1.Post)('previews'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload and validate employee JD assignments' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EmployeeJdImportController.prototype, "createPreview", null);
__decorate([
    (0, common_1.Get)('previews/:previewId/rows'),
    __param(0, (0, common_1.Param)('previewId')),
    __param(1, (0, common_1.Query)('filter')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployeeJdImportController.prototype, "getRows", null);
__decorate([
    (0, common_1.Patch)('previews/:previewId/rows/:rowNumber'),
    __param(0, (0, common_1.Param)('previewId')),
    __param(1, (0, common_1.Param)('rowNumber')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployeeJdImportController.prototype, "updateRow", null);
__decorate([
    (0, common_1.Delete)('previews/:previewId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('previewId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EmployeeJdImportController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('previews/:previewId/commit'),
    __param(0, (0, common_1.Param)('previewId')),
    __param(1, (0, common_1.Body)('confirmReplacement')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployeeJdImportController.prototype, "commit", null);
exports.EmployeeJdImportController = EmployeeJdImportController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point - Employee JD Imports'),
    (0, common_1.Controller)('hrbp-point/employee-jd-imports'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __metadata("design:paramtypes", [employee_jd_import_service_1.EmployeeJdImportService])
], EmployeeJdImportController);
//# sourceMappingURL=employee-jd-import.controller.js.map