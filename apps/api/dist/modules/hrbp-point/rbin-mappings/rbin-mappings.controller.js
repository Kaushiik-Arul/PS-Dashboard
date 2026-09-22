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
exports.RbinMappingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const rbin_mappings_service_1 = require("./rbin-mappings.service");
let RbinMappingsController = class RbinMappingsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(kind, search, filter, page, pageSize) {
        return this.service.list(kind, search, filter, page, pageSize);
    }
    create(kind, body) {
        return this.service.create(kind, body);
    }
    update(kind, mappingId, body) {
        return this.service.update(kind, mappingId, body);
    }
    delete(kind, mappingId) {
        return this.service.delete(kind, mappingId);
    }
};
exports.RbinMappingsController = RbinMappingsController;
__decorate([
    (0, common_1.Get)(':kind'),
    (0, swagger_1.ApiOperation)({ summary: 'Search and page RBIN Organizational Unit mappings' }),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('filter')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RbinMappingsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':kind'),
    (0, swagger_1.ApiOperation)({ summary: 'Create an RBIN Organizational Unit mapping' }),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RbinMappingsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':kind/:mappingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an RBIN Organizational Unit mapping' }),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('mappingId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], RbinMappingsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':kind/:mappingId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an RBIN Organizational Unit mapping' }),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('mappingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RbinMappingsController.prototype, "delete", null);
exports.RbinMappingsController = RbinMappingsController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point - RBIN Mappings'),
    (0, common_1.Controller)('hrbp-point/rbin-mappings'),
    (0, require_permission_decorator_1.RequirePermission)('namelist:transform'),
    __metadata("design:paramtypes", [rbin_mappings_service_1.RbinMappingsService])
], RbinMappingsController);
//# sourceMappingURL=rbin-mappings.controller.js.map