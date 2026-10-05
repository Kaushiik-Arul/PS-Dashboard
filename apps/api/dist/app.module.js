"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const environment_1 = require("./config/environment");
const access_point_module_1 = require("./modules/access-point/access-point.module");
const auth_module_1 = require("./modules/auth/auth.module");
const employee_360_module_1 = require("./modules/employee-360/employee-360.module");
const hrbp_point_module_1 = require("./modules/hrbp-point/hrbp-point.module");
const overview_module_1 = require("./modules/overview/overview.module");
const succession_planning_module_1 = require("./modules/succession-planning/succession-planning.module");
const talent_pipeline_module_1 = require("./modules/talent-pipeline/talent-pipeline.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                cache: true,
                isGlobal: true,
                validate: environment_1.validateEnvironment,
            }),
            auth_module_1.AuthModule,
            access_point_module_1.AccessPointModule,
            employee_360_module_1.Employee360Module,
            hrbp_point_module_1.HrbpPointModule,
            overview_module_1.OverviewModule,
            succession_planning_module_1.SuccessionPlanningModule,
            talent_pipeline_module_1.TalentPipelineModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map