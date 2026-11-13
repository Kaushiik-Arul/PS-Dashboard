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
exports.AttritionMovementsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../../auth/auth.decorators");
const attrition_movements_service_1 = require("./attrition-movements.service");
let AttritionMovementsController = class AttritionMovementsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(view, search, year, month, page, pageSize) {
        return this.service.list(view, search, year, month, page, pageSize);
    }
    async exportConfirmedHistory(actor) {
        const result = await this.service.exportConfirmedHistory(actor.accountId);
        return new common_1.StreamableFile(result.buffer, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            disposition: `attachment; filename="${result.fileName}"`,
            length: result.buffer.length,
        });
    }
    dismissCandidate(candidateId, actor) {
        return this.service.dismissCandidate(candidateId, actor.accountId);
    }
};
exports.AttritionMovementsController = AttritionMovementsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Search, filter, and page RBIN attrition movements' }),
    __param(0, (0, common_1.Query)('view')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttritionMovementsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('export'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, require_permission_decorator_1.RequirePermission)('attrition:export'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AttritionMovementsController.prototype, "exportConfirmedHistory", null);
__decorate([
    (0, common_1.Delete)('candidates/:candidateId'),
    (0, common_1.HttpCode)(204),
    (0, require_permission_decorator_1.RequirePermission)('attrition:import'),
    __param(0, (0, common_1.Param)('candidateId')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AttritionMovementsController.prototype, "dismissCandidate", null);
exports.AttritionMovementsController = AttritionMovementsController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point - Attrition Movements'),
    (0, common_1.Controller)('hrbp-point/attrition-movements'),
    (0, require_permission_decorator_1.RequirePermission)('attrition:view'),
    __metadata("design:paramtypes", [attrition_movements_service_1.AttritionMovementsService])
], AttritionMovementsController);
//# sourceMappingURL=attrition-movements.controller.js.map