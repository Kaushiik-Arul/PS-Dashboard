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
exports.OverviewController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const overview_response_dto_1 = require("./dto/overview-response.dto");
const overview_filter_dto_1 = require("./dto/overview-filter.dto");
const overview_service_1 = require("./overview.service");
let OverviewController = class OverviewController {
    service;
    constructor(service) {
        this.service = service;
    }
    getAvailableMonths() {
        return this.service.getAvailableMonths();
    }
    getArchivedMonths() {
        return this.service.getArchivedMonths();
    }
    getArchivedOverview(reportingMonth) {
        return this.service.getArchivedOverview(reportingMonth);
    }
    getOverviewDetails(filters, user) {
        return this.service.getOverviewDetails(filters, user.accountId);
    }
    getOverview(filters, user) {
        return this.service.getOverview(filters, user.accountId);
    }
};
exports.OverviewController = OverviewController;
__decorate([
    (0, common_1.Get)('available-months'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'List available historical Overview months' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OverviewController.prototype, "getAvailableMonths", null);
__decorate([
    (0, common_1.Get)('archived-months'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard-history:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List HRBP-only archived Overview months' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OverviewController.prototype, "getArchivedMonths", null);
__decorate([
    (0, common_1.Get)('archive/:reportingMonth'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard-history:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Fetch an HRBP-only archived Overview snapshot' }),
    __param(0, (0, common_1.Param)('reportingMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OverviewController.prototype, "getArchivedOverview", null);
__decorate([
    (0, common_1.Get)('details'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Fetch employees represented by an Overview KPI' }),
    (0, swagger_1.ApiOkResponse)({ type: [overview_response_dto_1.OverviewEmployeeDetailDto] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [overview_filter_dto_1.OverviewDetailsFilterDto, Object]),
    __metadata("design:returntype", Promise)
], OverviewController.prototype, "getOverviewDetails", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Fetch overview KPIs and chart data' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Calculated workforce overview',
        type: overview_response_dto_1.OverviewResponseDto,
    }),
    (0, swagger_1.ApiInternalServerErrorResponse)({
        description: 'Unable to load the workforce overview',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [overview_filter_dto_1.OverviewFilterDto, Object]),
    __metadata("design:returntype", Promise)
], OverviewController.prototype, "getOverview", null);
exports.OverviewController = OverviewController = __decorate([
    (0, swagger_1.ApiTags)('Overview'),
    (0, common_1.Controller)('overview'),
    (0, require_permission_decorator_1.RequirePermission)('workforce:view'),
    __metadata("design:paramtypes", [overview_service_1.OverviewService])
], OverviewController);
//# sourceMappingURL=overview.controller.js.map