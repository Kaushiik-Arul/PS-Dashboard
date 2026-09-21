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
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const auth_cookies_1 = require("./auth.cookies");
const auth_decorators_1 = require("./auth.decorators");
const auth_service_1 = require("./auth.service");
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
let AuthGuard = class AuthGuard {
    reflector;
    authService;
    config;
    constructor(reflector, authService, config) {
        this.reflector = reflector;
        this.authService = authService;
        this.config = config;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(auth_decorators_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const isProduction = this.config.get('NODE_ENV', { infer: true }) === 'production';
        const sessionToken = (0, auth_cookies_1.readCookie)(request, (0, auth_cookies_1.getSessionCookieName)(isProduction));
        const user = await this.authService.authenticate(sessionToken);
        if (!user)
            throw new common_1.UnauthorizedException('Authentication required');
        request.user = user;
        const allowPasswordChange = this.reflector.getAllAndOverride(auth_decorators_1.ALLOW_PASSWORD_CHANGE_KEY, [context.getHandler(), context.getClass()]);
        if (user.mustChangePassword && !allowPasswordChange) {
            throw new common_1.ForbiddenException('Password change required');
        }
        if (!safeMethods.has(request.method)) {
            const csrfCookie = (0, auth_cookies_1.readCookie)(request, auth_cookies_1.csrfCookieName);
            const csrfHeader = request.headers['x-csrf-token'];
            this.authService.validateCsrf(user, csrfCookie, typeof csrfHeader === 'string' ? csrfHeader : undefined);
        }
        return true;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        auth_service_1.AuthService,
        config_1.ConfigService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map