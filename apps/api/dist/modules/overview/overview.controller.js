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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const overview_response_dto_1 = require("./dto/overview-response.dto");
const overview_service_1 = require("./overview.service");
let OverviewController = class OverviewController {
    service;
    constructor(service) {
        this.service = service;
    }
    getOverview() {
        return this.service.getOverview();
    }
};
exports.OverviewController = OverviewController;
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OverviewController.prototype, "getOverview", null);
exports.OverviewController = OverviewController = __decorate([
    (0, swagger_1.ApiTags)('Overview'),
    (0, common_1.Controller)('overview'),
    __metadata("design:paramtypes", [overview_service_1.OverviewService])
], OverviewController);
//# sourceMappingURL=overview.controller.js.map