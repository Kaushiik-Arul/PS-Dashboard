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
exports.SuccessionPlanningController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const require_permission_decorator_1 = require("../../common/authorization/require-permission.decorator");
const auth_decorators_1 = require("../auth/auth.decorators");
const succession_planning_service_1 = require("./succession-planning.service");
let SuccessionPlanningController = class SuccessionPlanningController {
    service;
    constructor(service) {
        this.service = service;
    }
    getRegister(user) {
        return this.service.getRegister(user.accountId);
    }
};
exports.SuccessionPlanningController = SuccessionPlanningController;
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('succession-planning:view'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SuccessionPlanningController.prototype, "getRegister", null);
exports.SuccessionPlanningController = SuccessionPlanningController = __decorate([
    (0, swagger_1.ApiTags)('Succession Planning'),
    (0, common_1.Controller)('succession-planning'),
    __metadata("design:paramtypes", [succession_planning_service_1.SuccessionPlanningService])
], SuccessionPlanningController);
//# sourceMappingURL=succession-planning.controller.js.map