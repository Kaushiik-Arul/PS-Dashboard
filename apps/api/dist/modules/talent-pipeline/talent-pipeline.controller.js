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
exports.TalentPipelineController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const talent_pipeline_filter_dto_1 = require("./dto/talent-pipeline-filter.dto");
const talent_pipeline_response_dto_1 = require("./dto/talent-pipeline-response.dto");
const talent_pipeline_service_1 = require("./talent-pipeline.service");
let TalentPipelineController = class TalentPipelineController {
    service;
    constructor(service) {
        this.service = service;
    }
    getHistoryState() {
        return this.service.getHistoryState();
    }
    getSnapshot(reportingMonth) {
        return this.service.getSnapshot(reportingMonth);
    }
    publishSnapshot(reportingMonth, user) {
        return this.service.publishSnapshot(reportingMonth, user.accountId);
    }
    getTalentPipeline(filters, user) {
        return this.service.getTalentPipeline(filters, user.accountId);
    }
};
exports.TalentPipelineController = TalentPipelineController;
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard-history:view'),
    (0, swagger_1.ApiOperation)({ summary: 'List HRBP-only Talent Pipeline snapshot months' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TalentPipelineController.prototype, "getHistoryState", null);
__decorate([
    (0, common_1.Get)('history/:reportingMonth'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard-history:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Fetch an HRBP-only Talent Pipeline snapshot' }),
    __param(0, (0, common_1.Param)('reportingMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TalentPipelineController.prototype, "getSnapshot", null);
__decorate([
    (0, common_1.Post)('snapshots'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, require_permission_decorator_1.RequirePermission)('dashboard-history:view'),
    (0, swagger_1.ApiOperation)({ summary: 'Save the current Talent Pipeline monthly snapshot' }),
    __param(0, (0, common_1.Body)('reportingMonth')),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TalentPipelineController.prototype, "publishSnapshot", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({ summary: 'Fetch Talent Pipeline KPIs and chart data' }),
    (0, swagger_1.ApiOkResponse)({ type: talent_pipeline_response_dto_1.TalentPipelineResponseDto }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [talent_pipeline_filter_dto_1.TalentPipelineFilterDto, Object]),
    __metadata("design:returntype", void 0)
], TalentPipelineController.prototype, "getTalentPipeline", null);
exports.TalentPipelineController = TalentPipelineController = __decorate([
    (0, swagger_1.ApiTags)('Talent Pipeline'),
    (0, common_1.Controller)('talent-pipeline'),
    (0, require_permission_decorator_1.RequirePermission)('workforce:view'),
    __metadata("design:paramtypes", [talent_pipeline_service_1.TalentPipelineService])
], TalentPipelineController);
//# sourceMappingURL=talent-pipeline.controller.js.map