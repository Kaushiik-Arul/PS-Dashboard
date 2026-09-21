import type { UserRole } from "./roles";

export type Permission =
  | "exportCharts"
  | "manageEmployeeStatus"
  | "viewHrbpPoint"
  | "viewEmployee360"
  | "viewTalentPipeline"
  | "successionPlanningPoint"
  | "manageAccessPoint";

export const permissions: Record<Permission, readonly UserRole[]> = {
  exportCharts: ["hrbp"],
  manageEmployeeStatus: ["hrbp"],
  viewHrbpPoint: ["hrbp"],
  viewEmployee360: ["hrbp", "admin"],
  viewTalentPipeline: ["hrbp", "admin"],
  successionPlanningPoint: ["hrbp", "admin"],
  manageAccessPoint: ["hrbp"],
};

export function hasPermission(
  role: UserRole | null,
  permission: Permission
) {
  return role !== null && permissions[permission].includes(role);
}