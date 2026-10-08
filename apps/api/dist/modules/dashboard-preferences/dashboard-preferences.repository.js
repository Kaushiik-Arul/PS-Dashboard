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
exports.DashboardPreferencesRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
let DashboardPreferencesRepository = class DashboardPreferencesRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getOverviewWidgetIds(accountId) {
        const result = await this.database.query(`SELECT widget_ids
       FROM public.account_dashboard_preferences
       WHERE account_id = $1::UUID AND dashboard_key = 'overview'`, [accountId]);
        return result.rows[0]?.widget_ids ?? null;
    }
    async saveOverviewWidgetIds(accountId, widgetIds) {
        await this.database.query(`INSERT INTO public.account_dashboard_preferences (
         account_id, dashboard_key, widget_ids
       ) VALUES ($1::UUID, 'overview', $2::TEXT[])
       ON CONFLICT (account_id, dashboard_key) DO UPDATE
       SET widget_ids = EXCLUDED.widget_ids,
           updated_at = CURRENT_TIMESTAMP`, [accountId, widgetIds]);
    }
    async resetOverview(accountId) {
        await this.database.query(`DELETE FROM public.account_dashboard_preferences
       WHERE account_id = $1::UUID AND dashboard_key = 'overview'`, [accountId]);
    }
};
exports.DashboardPreferencesRepository = DashboardPreferencesRepository;
exports.DashboardPreferencesRepository = DashboardPreferencesRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], DashboardPreferencesRepository);
//# sourceMappingURL=dashboard-preferences.repository.js.map