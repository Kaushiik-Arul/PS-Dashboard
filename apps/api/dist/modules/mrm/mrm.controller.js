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
exports.MrmController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const mrm_service_1 = require("./mrm.service");
let MrmController = class MrmController {
    service;
    constructor(service) {
        this.service = service;
    }
    listMonths() {
        return this.service.listMonths();
    }
    getReport(reportingMonth, user) {
        return this.service.getReport(reportingMonth, user);
    }
    saveReport(reportingMonth, body, user) {
        return this.service.saveReport(reportingMonth, user, body);
    }
    finalize(reportingMonth, expectedRevision, user) {
        return this.service.finalize(reportingMonth, user, expectedRevision);
    }
    uploadAttachment(reportingMonth, rowKey, columnKey, file, user) {
        return this.service.uploadAttachment(reportingMonth, user, rowKey, columnKey, file);
    }
    async downloadAttachment(reportingMonth, attachmentId, user, response) {
        const attachment = await this.service.downloadAttachment(reportingMonth, attachmentId, user);
        const filename = attachment.filename.replace(/[\r\n"]/g, '_');
        response.setHeader('Content-Type', attachment.mime_type);
        response.setHeader('Content-Length', String(attachment.size_bytes));
        response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        response.setHeader('Cache-Control', 'private, no-store');
        return attachment.content;
    }
    deleteAttachment(reportingMonth, attachmentId, user) {
        return this.service.deleteAttachment(reportingMonth, attachmentId, user);
    }
};
exports.MrmController = MrmController;
__decorate([
    (0, common_1.Get)('months'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MrmController.prototype, "listMonths", null);
__decorate([
    (0, common_1.Get)('reports/:reportingMonth'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    __param(0, (0, common_1.Param)('reportingMonth')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MrmController.prototype, "getReport", null);
__decorate([
    (0, common_1.Patch)('reports/:reportingMonth'),
    (0, require_permission_decorator_1.RequirePermission)('mrm:manage'),
    __param(0, (0, common_1.Param)('reportingMonth')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MrmController.prototype, "saveReport", null);
__decorate([
    (0, common_1.Post)('reports/:reportingMonth/finalize'),
    (0, require_permission_decorator_1.RequirePermission)('mrm:manage'),
    __param(0, (0, common_1.Param)('reportingMonth')),
    __param(1, (0, common_1.Body)('expectedRevision')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MrmController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)('reports/:reportingMonth/attachments'),
    (0, require_permission_decorator_1.RequirePermission)('mrm:manage'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } })),
    __param(0, (0, common_1.Param)('reportingMonth')),
    __param(1, (0, common_1.Body)('rowKey')),
    __param(2, (0, common_1.Body)('columnKey')),
    __param(3, (0, common_1.UploadedFile)()),
    __param(4, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], MrmController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Get)('reports/:reportingMonth/attachments/:attachmentId'),
    __param(0, (0, common_1.Param)('reportingMonth')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], MrmController.prototype, "downloadAttachment", null);
__decorate([
    (0, common_1.Delete)('reports/:reportingMonth/attachments/:attachmentId'),
    (0, common_1.HttpCode)(204),
    (0, require_permission_decorator_1.RequirePermission)('mrm:manage'),
    __param(0, (0, common_1.Param)('reportingMonth')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MrmController.prototype, "deleteAttachment", null);
exports.MrmController = MrmController = __decorate([
    (0, swagger_1.ApiTags)('MRM'),
    (0, common_1.Controller)('mrm'),
    (0, require_permission_decorator_1.RequirePermission)('mrm:view'),
    __metadata("design:paramtypes", [mrm_service_1.MrmService])
], MrmController);
//# sourceMappingURL=mrm.controller.js.map