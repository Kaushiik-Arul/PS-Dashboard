import type { UserRole } from '../../modules/auth/auth.types';
export declare const permissions: readonly ["workforce:view", "dashboard-history:view", "succession-planning:view", "succession-planning:import", "attrition:view", "attrition:import", "hrbp-point:view", "hrbp-point:manage", "headcount:import", "namelist:import", "namelist:transform", "namelist:export", "access-point:manage", "workforce:edit", "workforce:export"];
export type Permission = (typeof permissions)[number];
export declare function hasPermission(roles: readonly UserRole[], permission: Permission): boolean;
