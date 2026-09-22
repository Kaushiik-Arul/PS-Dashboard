"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Employee360Module = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../database/database.module");
const employee_360_controller_1 = require("./employee-360.controller");
const employee_360_repository_1 = require("./employee-360.repository");
const employee_360_service_1 = require("./employee-360.service");
let Employee360Module = class Employee360Module {
};
exports.Employee360Module = Employee360Module;
exports.Employee360Module = Employee360Module = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [employee_360_controller_1.Employee360Controller],
        providers: [employee_360_repository_1.Employee360Repository, employee_360_service_1.Employee360Service],
    })
], Employee360Module);
//# sourceMappingURL=employee-360.module.js.map