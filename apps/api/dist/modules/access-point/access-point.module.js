"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessPointModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../database/database.module");
const auth_module_1 = require("../auth/auth.module");
const access_point_controller_1 = require("./access-point.controller");
const access_point_repository_1 = require("./access-point.repository");
const access_point_service_1 = require("./access-point.service");
let AccessPointModule = class AccessPointModule {
};
exports.AccessPointModule = AccessPointModule;
exports.AccessPointModule = AccessPointModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, auth_module_1.AuthModule],
        controllers: [access_point_controller_1.AccessPointController],
        providers: [access_point_repository_1.AccessPointRepository, access_point_service_1.AccessPointService],
    })
], AccessPointModule);
//# sourceMappingURL=access-point.module.js.map