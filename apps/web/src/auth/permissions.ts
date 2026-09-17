import type { UserRole } from "./roles";

export type Permission =
  | "exportCharts"
  | "viewHrbpPoint"
  | "successionPlanningPoint";

export const permissions: Record<Permission, readonly UserRole[]> = {
  exportCharts: ["hrbp"],
  viewHrbpPoint: ["hrbp"],
  successionPlanningPoint: ["hrbp", "Range Head"]
};

export function hasPermission(
  role: UserRole,
  permission: Permission
) {
  return permissions[permission].includes(role);
}