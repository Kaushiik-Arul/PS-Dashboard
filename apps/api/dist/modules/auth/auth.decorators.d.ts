export declare const IS_PUBLIC_KEY = "auth:is-public";
export declare const ALLOW_PASSWORD_CHANGE_KEY = "auth:allow-password-change";
export declare const Public: () => import("@nestjs/common", { with: { "resolution-mode": "import" } }).CustomDecorator<string>;
export declare const AllowPasswordChange: () => import("@nestjs/common", { with: { "resolution-mode": "import" } }).CustomDecorator<string>;
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
