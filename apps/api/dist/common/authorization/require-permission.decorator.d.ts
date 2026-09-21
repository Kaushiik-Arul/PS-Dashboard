import type { Permission } from './permissions';
export declare const REQUIRED_PERMISSION_KEY = "authorization:required-permission";
export declare const RequirePermission: (permission: Permission) => import("@nestjs/common", { with: { "resolution-mode": "import" } }).CustomDecorator<string>;
