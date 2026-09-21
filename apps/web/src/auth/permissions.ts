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
  viewEmployee360: ["hrbp", "admin", "range_head", "department_head", "sub_department_head"],
  viewTalentPipeline: ["hrbp", "admin", "range_head", "department_head", "sub_department_head"],
  successionPlanningPoint: ["hrbp", "admin", "range_head", "department_head", "sub_department_head"],
  manageAccessPoint: ["hrbp"],
};

export function hasPermission(
  role: UserRole | null,
  permission: Permission
) {
  return role !== null && permissions[permission].includes(role);
}