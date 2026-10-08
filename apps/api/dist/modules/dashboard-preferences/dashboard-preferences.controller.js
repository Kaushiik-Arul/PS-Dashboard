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
exports.DashboardPreferencesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const dashboard_preferences_service_1 = require("./dashboard-preferences.service");
let DashboardPreferencesController = class DashboardPreferencesController {
    service;
    constructor(service) {
        this.service = service;
    }
    getOverview(user) {
        return this.service.getOverview(user.accountId);
    }
    saveOverview(body, user) {
        return this.service.saveOverview(user.accountId, body);
    }
    resetOverview(user) {
        return this.service.resetOverview(user.accountId);
    }
};
exports.DashboardPreferencesController = DashboardPreferencesController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the current account Overview layout' }),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardPreferencesController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Put)('overview'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Save the current account Overview layout' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardPreferencesController.prototype, "saveOverview", null);
__decorate([
    (0, common_1.Delete)('overview'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset the current account Overview layout' }),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardPreferencesController.prototype, "resetOverview", null);
exports.DashboardPreferencesController = DashboardPreferencesController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard Preferences'),
    (0, common_1.Controller)('dashboard-preferences'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard-customization:manage'),
    __metadata("design:paramtypes", [dashboard_preferences_service_1.DashboardPreferencesService])
], DashboardPreferencesController);
//# sourceMappingURL=dashboard-preferences.controller.js.map