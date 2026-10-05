import type { UserRole } from '../../modules/auth/auth.types';

export const permissions = [
  'workforce:view',
  'dashboard-history:view',
  'succession-planning:view',
  'succession-planning:import',
  'hrbp-point:view',
  'hrbp-point:manage',
  'namelist:import',
  'namelist:transform',
  'namelist:export',
  'access-point:manage',
  'workforce:edit',
  'workforce:export',
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  hrbp: new Set(permissions),
  admin: new Set(['workforce:view', 'succession-planning:view']),
  range_head: new Set(['workforce:view', 'succession-planning:view']),
  department_head: new Set(['workforce:view', 'succession-planning:view']),
  sub_department_head: new Set(['workforce:view', 'succession-planning:view']),
};

export function hasPermission(
  roles: readonly UserRole[],
  permission: Permission,
): boolean {
  return roles.some((role) => rolePermissions[role].has(permission));
}