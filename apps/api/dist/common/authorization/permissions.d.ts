import type { UserRole } from '../../modules/auth/auth.types';
export declare const permissions: readonly ["workforce:view", "hrbp-point:view", "hrbp-point:manage", "access-point:manage", "workforce:edit", "workforce:export"];
export type Permission = (typeof permissions)[number];
export declare function hasPermission(roles: readonly UserRole[], permission: Permission): boolean;
