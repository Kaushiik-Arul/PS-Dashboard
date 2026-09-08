import type { UserRole } from "./roles";

export type Permission =
  | "exportCharts"
  | "viewHrbpPoint";

export const permissions: Record<Permission, readonly UserRole[]> = {
  exportCharts: ["hrbp"],
  viewHrbpPoint: ["hrbp"],
};

export function hasPermission(
  role: UserRole,
  permission: Permission
) {
  return permissions[permission].includes(role);
}