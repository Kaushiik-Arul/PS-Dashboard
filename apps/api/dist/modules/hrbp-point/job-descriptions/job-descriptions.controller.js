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
exports.JobDescriptionsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const job_descriptions_service_1 = require("./job-descriptions.service");
let JobDescriptionsController = class JobDescriptionsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(search, page, pageSize) {
        return this.service.list(search, page, pageSize);
    }
    create(body, user) {
        return this.service.create(body, user.accountId);
    }
    importCsv(file, user) {
        return this.service.importCsv(file, user.accountId);
    }
    update(id, body, user) {
        return this.service.update(id, body, user.accountId);
    }
    delete(id, user) {
        return this.service.delete(id, user.accountId);
    }
};
exports.JobDescriptionsController = JobDescriptionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Search and page job descriptions' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], JobDescriptionsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a job description' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], JobDescriptionsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Import JD ID and Role Title mappings from CSV' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], JobDescriptionsController.prototype, "importCsv", null);
__decorate([
    (0, common_1.Patch)(':jobDescriptionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a job description' }),
    __param(0, (0, common_1.Param)('jobDescriptionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], JobDescriptionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':jobDescriptionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a job description' }),
    __param(0, (0, common_1.Param)('jobDescriptionId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], JobDescriptionsController.prototype, "delete", null);
exports.JobDescriptionsController = JobDescriptionsController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point - Job Descriptions'),
    (0, common_1.Controller)('hrbp-point/job-descriptions'),
    (0, require_permission_decorator_1.RequirePermission)('hrbp-point:manage'),
    __metadata("design:paramtypes", [job_descriptions_service_1.JobDescriptionsService])
], JobDescriptionsController);
//# sourceMappingURL=job-descriptions.controller.js.map