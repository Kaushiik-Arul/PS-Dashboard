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
exports.PoolRegisterController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const pool_register_service_1 = require("./pool-register.service");
let PoolRegisterController = class PoolRegisterController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(kind, actor) {
        return this.service.list(this.service.kind(kind), actor.accountId);
    }
    lookup(kind, persNo) {
        this.service.kind(kind);
        return this.service.lookup(persNo);
    }
    add(kind, values, actor) {
        return this.service.save(this.service.kind(kind), actor.accountId, values);
    }
    update(kind, id, values, actor) {
        return this.service.save(this.service.kind(kind), actor.accountId, values, id);
    }
    remove(kind, id) {
        return this.service.remove(this.service.kind(kind), id);
    }
    upload(kind, file, actor) {
        return this.service.upload(this.service.kind(kind), actor.accountId, file);
    }
    preview(kind, id, filter, page, actor) {
        return this.service.preview(this.service.kind(kind), actor.accountId, id, filter, page);
    }
    editPreview(kind, id, row, values, actor) {
        if (values === undefined)
            throw new common_1.BadRequestException('Row values are required.');
        return this.service.editPreview(this.service.kind(kind), actor.accountId, id, row, values);
    }
    deletePreviewRow(kind, id, row, actor) {
        return this.service.editPreview(this.service.kind(kind), actor.accountId, id, row);
    }
    cancel(kind, id, actor) {
        return this.service.cancel(this.service.kind(kind), actor.accountId, id);
    }
    commit(kind, id, confirmed, actor) {
        return this.service.commit(this.service.kind(kind), actor.accountId, id, confirmed);
    }
};
exports.PoolRegisterController = PoolRegisterController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('workforce:view'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('employees/:persNo'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('persNo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "lookup", null);
__decorate([
    (0, common_1.Post)('rows'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Body)('values')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "add", null);
__decorate([
    (0, common_1.Patch)('rows/:id'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('values')),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('rows/:id'),
    (0, common_1.HttpCode)(204),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('previews'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    })),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('previews/:id/rows'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('filter')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "preview", null);
__decorate([
    (0, common_1.Patch)('previews/:id/rows/:row'),
    (0, common_1.HttpCode)(204),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('row')),
    __param(3, (0, common_1.Body)('values')),
    __param(4, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "editPreview", null);
__decorate([
    (0, common_1.Delete)('previews/:id/rows/:row'),
    (0, common_1.HttpCode)(204),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('row')),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "deletePreviewRow", null);
__decorate([
    (0, common_1.Delete)('previews/:id'),
    (0, common_1.HttpCode)(204),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('previews/:id/commit'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:import'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('confirmReplacement')),
    __param(3, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], PoolRegisterController.prototype, "commit", null);
exports.PoolRegisterController = PoolRegisterController = __decorate([
    (0, swagger_1.ApiTags)('Pool registers'),
    (0, common_1.Controller)('hrbp-point/pool-registers/:kind'),
    __metadata("design:paramtypes", [pool_register_service_1.PoolRegisterService])
], PoolRegisterController);
//# sourceMappingURL=pool-register.controller.js.map