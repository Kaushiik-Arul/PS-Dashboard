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
var DashboardPreferencesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPreferencesService = void 0;
const common_1 = require("@nestjs/common");
const dashboard_widget_catalog_1 = require("./dashboard-widget.catalog");
const dashboard_preferences_repository_1 = require("./dashboard-preferences.repository");
let DashboardPreferencesService = DashboardPreferencesService_1 = class DashboardPreferencesService {
    repository;
    logger = new common_1.Logger(DashboardPreferencesService_1.name);
    constructor(repository) {
        this.repository = repository;
    }
    async getOverview(accountId) {
        try {
            const widgetIds = await this.repository.getOverviewWidgetIds(accountId);
            return widgetIds === null
                ? { widgetIds: [...dashboard_widget_catalog_1.defaultOverviewWidgetIds], isDefault: true }
                : { widgetIds, isDefault: false };
        }
        catch (error) {
            this.logError('load', error);
            throw new common_1.InternalServerErrorException('Unable to load Overview preferences');
        }
    }
    async saveOverview(accountId, body) {
        const widgetIds = this.parseWidgetIds(body);
        try {
            await this.repository.saveOverviewWidgetIds(accountId, widgetIds);
            return { widgetIds, isDefault: false };
        }
        catch (error) {
            this.logError('save', error);
            throw new common_1.InternalServerErrorException('Unable to save Overview preferences');
        }
    }
    async resetOverview(accountId) {
        try {
            await this.repository.resetOverview(accountId);
            return { widgetIds: [...dashboard_widget_catalog_1.defaultOverviewWidgetIds], isDefault: true };
        }
        catch (error) {
            this.logError('reset', error);
            throw new common_1.InternalServerErrorException('Unable to reset Overview preferences');
        }
    }
    parseWidgetIds(body) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new common_1.BadRequestException('Overview preferences payload is invalid');
        }
        const widgetIds = body.widgetIds;
        if (!Array.isArray(widgetIds) || widgetIds.length > 64) {
            throw new common_1.BadRequestException('widgetIds must be an array with at most 64 items');
        }
        if (widgetIds.some((id) => typeof id !== 'string' || !dashboard_widget_catalog_1.overviewWidgetIdSet.has(id))) {
            throw new common_1.BadRequestException('widgetIds contains an unsupported widget');
        }
        if (new Set(widgetIds).size !== widgetIds.length) {
            throw new common_1.BadRequestException('widgetIds must not contain duplicates');
        }
        return widgetIds;
    }
    logError(action, error) {
        this.logger.error(`Unable to ${action} Overview preferences`, error instanceof Error ? error.stack : String(error));
    }
};
exports.DashboardPreferencesService = DashboardPreferencesService;
exports.DashboardPreferencesService = DashboardPreferencesService = DashboardPreferencesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [dashboard_preferences_repository_1.DashboardPreferencesRepository])
], DashboardPreferencesService);
//# sourceMappingURL=dashboard-preferences.service.js.map