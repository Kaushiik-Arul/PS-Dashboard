"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.AllowPasswordChange = exports.Public = exports.ALLOW_PASSWORD_CHANGE_KEY = exports.IS_PUBLIC_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IS_PUBLIC_KEY = 'auth:is-public';
exports.ALLOW_PASSWORD_CHANGE_KEY = 'auth:allow-password-change';
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
const AllowPasswordChange = () => (0, common_1.SetMetadata)(exports.ALLOW_PASSWORD_CHANGE_KEY, true);
exports.AllowPasswordChange = AllowPasswordChange;
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, context) => context.switchToHttp().getRequest().user);
//# sourceMappingURL=auth.decorators.js.map