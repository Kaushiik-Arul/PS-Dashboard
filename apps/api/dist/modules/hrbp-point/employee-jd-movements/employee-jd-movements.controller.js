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
exports.EmployeeJdMovementsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../../common/authorization/require-permission.decorator");
const employee_jd_movements_service_1 = require("./employee-jd-movements.service");
let EmployeeJdMovementsController = class EmployeeJdMovementsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(search, source, fromDate, toDate, role, page, pageSize) {
        return this.service.list(search, source, fromDate, toDate, role, page, pageSize);
    }
};
exports.EmployeeJdMovementsController = EmployeeJdMovementsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Search and page employee JD movements' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('source')),
    __param(2, (0, common_1.Query)('fromDate')),
    __param(3, (0, common_1.Query)('toDate')),
    __param(4, (0, common_1.Query)('role')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], EmployeeJdMovementsController.prototype, "list", null);
exports.EmployeeJdMovementsController = EmployeeJdMovementsController = __decorate([
    (0, swagger_1.ApiTags)('HRBP Point - Employee JD Movements'),
    (0, common_1.Controller)('hrbp-point/employee-jd-movements'),
    (0, require_permission_decorator_1.RequirePermission)('hrbp-point:manage'),
    __metadata("design:paramtypes", [employee_jd_movements_service_1.EmployeeJdMovementsService])
], EmployeeJdMovementsController);
//# sourceMappingURL=employee-jd-movements.controller.js.map