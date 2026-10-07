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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const argon2_1 = __importDefault(require("argon2"));
const node_crypto_1 = require("node:crypto");
const auth_repository_1 = require("./auth.repository");
const sessionLifetimeMilliseconds = 8 * 60 * 60 * 1000;
const passwordHashOptions = {
    type: argon2_1.default.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
};
function hashToken(token) {
    return (0, node_crypto_1.createHash)('sha256').update(token, 'utf8').digest();
}
function createCredentials() {
    return {
        sessionToken: (0, node_crypto_1.randomBytes)(32).toString('base64url'),
        csrfToken: (0, node_crypto_1.randomBytes)(32).toString('base64url'),
        expiresAt: new Date(Date.now() + sessionLifetimeMilliseconds),
    };
}
function publicUser(account, sessionId, csrfTokenHash) {
    return {
        accountId: account.accountId,
        persNo: account.persNo,
        displayName: account.displayName,
        loginEmail: account.loginEmail,
        role: account.role,
        roles: account.roles,
        mustChangePassword: account.mustChangePassword,
        sessionId,
        csrfTokenHash,
    };
}
let AuthService = class AuthService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async hashTemporaryPassword(value) {
        if (typeof value !== 'string' || value.length < 12 || value.length > 1024) {
            throw new common_1.BadRequestException('Temporary password must contain between 12 and 1024 characters');
        }
        return argon2_1.default.hash(value, passwordHashOptions);
    }
    async login(input, metadata) {
        const { email, password } = this.parseLogin(input);
        const account = await this.repository.findAccountByEmail(email);
        if (!account || account.accountStatus === 'inactive') {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const passwordMatches = await argon2_1.default.verify(account.passwordHash, password);
        if (!passwordMatches) {
            await this.repository.recordFailedLogin(account.accountId);
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const credentials = createCredentials();
        const csrfTokenHash = hashToken(credentials.csrfToken);
        const sessionId = await this.repository.createSession(account, hashToken(credentials.sessionToken), csrfTokenHash, credentials.expiresAt, metadata);
        return {
            ...credentials,
            user: publicUser(account, sessionId, csrfTokenHash),
        };
    }
    authenticate(sessionToken) {
        if (!sessionToken)
            return Promise.resolve(null);
        return this.repository.findActiveSession(hashToken(sessionToken));
    }
    validateCsrf(user, cookieToken, headerToken) {
        if (!cookieToken || !headerToken) {
            throw new common_1.UnauthorizedException('CSRF validation failed');
        }
        const cookieHash = hashToken(cookieToken);
        const headerHash = hashToken(headerToken);
        if (cookieHash.length !== headerHash.length ||
            !(0, node_crypto_1.timingSafeEqual)(cookieHash, headerHash) ||
            cookieHash.length !== user.csrfTokenHash.length ||
            !(0, node_crypto_1.timingSafeEqual)(cookieHash, user.csrfTokenHash)) {
            throw new common_1.UnauthorizedException('CSRF validation failed');
        }
    }
    async changePassword(user, input, metadata) {
        const { currentPassword, newPassword } = this.parsePasswordChange(input);
        const currentHash = await this.repository.getPasswordHash(user.accountId);
        if (!currentHash || !(await argon2_1.default.verify(currentHash, currentPassword))) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        if (await argon2_1.default.verify(currentHash, newPassword)) {
            throw new common_1.BadRequestException('New password must be different');
        }
        const nextHash = await argon2_1.default.hash(newPassword, passwordHashOptions);
        const credentials = createCredentials();
        const csrfTokenHash = hashToken(credentials.csrfToken);
        const sessionId = await this.repository.changePasswordAndRotateSession(user, nextHash, hashToken(credentials.sessionToken), csrfTokenHash, credentials.expiresAt, metadata);
        return {
            ...credentials,
            user: {
                ...user,
                mustChangePassword: false,
                sessionId,
                csrfTokenHash,
            },
        };
    }
    logout(user, metadata) {
        return this.repository.revokeSession(user, metadata);
    }
    parseLogin(input) {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            throw new common_1.BadRequestException('Email and password are required');
        }
        const source = input;
        const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
        const password = typeof source.password === 'string' ? source.password : '';
        if (!email || email.length > 320 || !password || password.length > 1024) {
            throw new common_1.BadRequestException('Email and password are required');
        }
        return { email, password };
    }
    parsePasswordChange(input) {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            throw new common_1.BadRequestException('Current and new passwords are required');
        }
        const source = input;
        const currentPassword = typeof source.currentPassword === 'string' ? source.currentPassword : '';
        const newPassword = typeof source.newPassword === 'string' ? source.newPassword : '';
        if (!currentPassword || newPassword.length < 12 || newPassword.length > 1024) {
            throw new common_1.BadRequestException('New password must contain between 12 and 1024 characters');
        }
        return { currentPassword, newPassword };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_repository_1.AuthRepository])
], AuthService);
//# sourceMappingURL=auth.service.js.map