"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MrmModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../database/database.module");
const mrm_calculation_repository_1 = require("./mrm-calculation.repository");
const mrm_calculation_service_1 = require("./mrm-calculation.service");
const mrm_controller_1 = require("./mrm.controller");
const mrm_repository_1 = require("./mrm.repository");
const mrm_service_1 = require("./mrm.service");
let MrmModule = class MrmModule {
};
exports.MrmModule = MrmModule;
exports.MrmModule = MrmModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [mrm_controller_1.MrmController],
        providers: [
            mrm_repository_1.MrmRepository,
            mrm_service_1.MrmService,
            mrm_calculation_repository_1.MrmCalculationRepository,
            mrm_calculation_service_1.MrmCalculationService,
        ],
        exports: [mrm_calculation_service_1.MrmCalculationService],
    })
], MrmModule);
//# sourceMappingURL=mrm.module.js.map