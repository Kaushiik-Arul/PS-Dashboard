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
exports.AttritionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const attrition_service_1 = require("./attrition.service");
const attrition_filter_dto_1 = require("./dto/attrition-filter.dto");
let AttritionController = class AttritionController {
    service;
    constructor(service) {
        this.service = service;
    }
    getFilterOptions(filters, user) {
        return this.service.getFilterOptions(user.accountId, filters);
    }
    getDashboard(filters, user) {
        return this.service.getDashboard(user.accountId, filters);
    }
};
exports.AttritionController = AttritionController;
__decorate([
    (0, common_1.Get)('filter-options'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attrition_filter_dto_1.AttritionFilterDto, Object]),
    __metadata("design:returntype", void 0)
], AttritionController.prototype, "getFilterOptions", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attrition_filter_dto_1.AttritionFilterDto, Object]),
    __metadata("design:returntype", void 0)
], AttritionController.prototype, "getDashboard", null);
exports.AttritionController = AttritionController = __decorate([
    (0, swagger_1.ApiTags)('Attrition'),
    (0, common_1.Controller)('attrition'),
    (0, require_permission_decorator_1.RequirePermission)('attrition:view'),
    __metadata("design:paramtypes", [attrition_service_1.AttritionService])
], AttritionController);
//# sourceMappingURL=attrition.controller.js.map