"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrbpPointModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../database/database.module");
const hrbp_point_controller_1 = require("./hrbp-point.controller");
const hrbp_point_repository_1 = require("./hrbp-point.repository");
const hrbp_point_service_1 = require("./hrbp-point.service");
const namelist_import_controller_1 = require("./namelist-import/namelist-import.controller");
const namelist_import_repository_1 = require("./namelist-import/namelist-import.repository");
const namelist_import_service_1 = require("./namelist-import/namelist-import.service");
const ppp_history_import_controller_1 = require("./ppp-history-import/ppp-history-import.controller");
const ppp_history_import_repository_1 = require("./ppp-history-import/ppp-history-import.repository");
const ppp_history_import_service_1 = require("./ppp-history-import/ppp-history-import.service");
const rbin_cleaning_controller_1 = require("./rbin-cleaning/rbin-cleaning.controller");
const rbin_cleaning_repository_1 = require("./rbin-cleaning/rbin-cleaning.repository");
const rbin_cleaning_service_1 = require("./rbin-cleaning/rbin-cleaning.service");
const rbin_exceptions_controller_1 = require("./rbin-exceptions/rbin-exceptions.controller");
const rbin_exceptions_repository_1 = require("./rbin-exceptions/rbin-exceptions.repository");
const rbin_exceptions_service_1 = require("./rbin-exceptions/rbin-exceptions.service");
const rbin_mappings_controller_1 = require("./rbin-mappings/rbin-mappings.controller");
const rbin_mappings_repository_1 = require("./rbin-mappings/rbin-mappings.repository");
const rbin_mappings_service_1 = require("./rbin-mappings/rbin-mappings.service");
let HrbpPointModule = class HrbpPointModule {
};
exports.HrbpPointModule = HrbpPointModule;
exports.HrbpPointModule = HrbpPointModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [hrbp_point_controller_1.HrbpPointController, namelist_import_controller_1.NamelistImportController, ppp_history_import_controller_1.PppHistoryImportController, rbin_cleaning_controller_1.RbinCleaningController, rbin_mappings_controller_1.RbinMappingsController, rbin_exceptions_controller_1.RbinExceptionsController],
        providers: [
            hrbp_point_service_1.HrbpPointService,
            hrbp_point_repository_1.HrbpPointRepository,
            namelist_import_service_1.NamelistImportService,
            namelist_import_repository_1.NamelistImportRepository,
            ppp_history_import_service_1.PppHistoryImportService,
            ppp_history_import_repository_1.PppHistoryImportRepository,
            rbin_cleaning_service_1.RbinCleaningService,
            rbin_cleaning_repository_1.RbinCleaningRepository,
            rbin_mappings_service_1.RbinMappingsService,
            rbin_mappings_repository_1.RbinMappingsRepository,
            rbin_exceptions_service_1.RbinExceptionsService,
            rbin_exceptions_repository_1.RbinExceptionsRepository,
        ],
    })
], HrbpPointModule);
//# sourceMappingURL=hrbp-point.module.js.map