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
exports.RbinCleaningController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const rbin_cleaning_service_1 = require("./rbin-cleaning.service");
let RbinCleaningController = class RbinCleaningController {
    service;
    constructor(service) {
        this.service = service;
    }
    createBatch(file, reportingMonth, user) {
        return this.service.createPreview(file, reportingMonth, user.accountId);
    }
    listBatches(user) {
        return this.service.listBatches(user.accountId);
    }
    getRows(batchId, filter, page, pageSize, search, view, user) {
        return this.service.getRows(batchId, user.accountId, filter, page, pageSize, search, view);
    }
    updateRow(batchId, rowNumber, input, user) {
        return this.service.updateRow(batchId, rowNumber, input, user.accountId);
    }
    finalize(batchId, user) {
        return this.service.finalize(batchId, user.accountId);
    }
    async export(batchId, user) {
        const result = await this.service.exportBatch(batchId, user.accountId);
        return new common_1.StreamableFile(result.buffer, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            disposition: `attachment; filename="${result.fileName}"`,
            length: result.buffer.length,
        });
    }
};
exports.RbinCleaningController = RbinCleaningController;
__decorate([
    (0, common_1.Post)('batches'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload, transform, and stage an RBIN namelist' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('reportingMonth')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], RbinCleaningController.prototype, "createBatch", null);
__decorate([
    (0, common_1.Get)('batches'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RbinCleaningController.prototype, "listBatches", null);
__decorate([
    (0, common_1.Get)('batches/:batchId/rows'),
    __param(0, (0, common_1.Param)('batchId')),
    __param(1, (0, common_1.Query)('filter')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('view')),
    __param(6, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], RbinCleaningController.prototype, "getRows", null);
__decorate([
    (0, common_1.Patch)('batches/:batchId/rows/:rowNumber'),
    __param(0, (0, common_1.Param)('batchId')),
    __param(1, (0, common_1.Param)('rowNumber')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], RbinCleaningController.prototype, "updateRow", null);
__decorate([
    (0, common_1.Post)('batches/:batchId/finalize'),
    __param(0, (0, common_1.Param)('batchId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RbinCleaningController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)('batches/:batchId/export'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:export'),
    __param(0, (0, common_1.Param)('batchId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RbinCleaningController.prototype, "export", null);
exports.RbinCleaningController = RbinCleaningController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point - RBIN Cleaning'),
    (0, common_1.Controller)('hrbp-point/rbin-cleaning'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:transform'),
    __metadata("design:paramtypes", [rbin_cleaning_service_1.RbinCleaningService])
], RbinCleaningController);
//# sourceMappingURL=rbin-cleaning.controller.js.map