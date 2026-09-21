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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_decorators_1 = require("./auth.decorators");
const auth_cookies_1 = require("./auth.cookies");
const auth_service_1 = require("./auth.service");
function metadata(request) {
    return {
        ipAddress: request.ip || null,
        userAgent: typeof request.headers['user-agent'] === 'string'
            ? request.headers['user-agent'].slice(0, 500)
            : null,
    };
}
function responseUser(user) {
    return {
        accountId: user.accountId,
        persNo: user.persNo,
        displayName: user.displayName,
        loginEmail: user.loginEmail,
        role: user.role,
        roles: user.roles,
        mustChangePassword: user.mustChangePassword,
    };
}
let AuthController = class AuthController {
    authService;
    config;
    constructor(authService, config) {
        this.authService = authService;
        this.config = config;
    }
    async login(input, request, response) {
        const result = await this.authService.login(input, metadata(request));
        this.writeSession(response, result);
        return responseUser(result.user);
    }
    me(user) {
        return responseUser(user);
    }
    async changePassword(user, input, request, response) {
        const result = await this.authService.changePassword(user, input, metadata(request));
        this.writeSession(response, result);
        return responseUser(result.user);
    }
    async logout(user, request, response) {
        await this.authService.logout(user, metadata(request));
        (0, auth_cookies_1.clearAuthCookies)(response, this.isProduction());
    }
    writeSession(response, result) {
        (0, auth_cookies_1.setAuthCookies)(response, this.isProduction(), result.sessionToken, result.csrfToken, result.expiresAt.getTime() - Date.now());
    }
    isProduction() {
        return this.config.get('NODE_ENV', { infer: true }) === 'production';
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, auth_decorators_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, auth_decorators_1.AllowPasswordChange)(),
    (0, common_1.Get)('me'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, auth_decorators_1.AllowPasswordChange)(),
    (0, common_1.Post)('change-password'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, auth_decorators_1.AllowPasswordChange)(),
    (0, common_1.Post)('logout'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map