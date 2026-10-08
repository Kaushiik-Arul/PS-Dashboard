import type { UserRole } from '../../modules/auth/auth.types';

export const permissions = [
  'workforce:view',
  'dashboard-history:view',
  'succession-planning:view',
  'succession-planning:import',
  'attrition:view',
  'attrition:import',
  'hrbp-point:view',
  'hrbp-point:manage',
  'headcount:import',
  'namelist:import',
  'namelist:transform',
  'namelist:export',
  'access-point:manage',
  'workforce:edit',
  'workforce:export',
  'dashboard-customization:manage',
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  hrbp: new Set(permissions),
  admin: new Set(['workforce:view', 'succession-planning:view', 'attrition:view', 'dashboard-customization:manage']),
  range_head: new Set(['workforce:view', 'succession-planning:view', 'attrition:view']),
  department_head: new Set(['workforce:view', 'succession-planning:view', 'attrition:view']),
  sub_department_head: new Set(['workforce:view', 'succession-planning:view', 'attrition:view']),
};

export function hasPermission(
  roles: readonly UserRole[],
  permission: Permission,
): boolean {
  return roles.some((role) => rolePermissions[role].has(permission));
}