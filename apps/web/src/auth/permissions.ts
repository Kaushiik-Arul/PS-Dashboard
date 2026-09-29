import type { UserRole } from "./roles";

export type Permission =
  | "exportCharts"
  | "manageTalentPipeline"
  | "manageEmployeeStatus"
  | "manageNamelist"
  | "viewHrbpPoint"
  | "viewEmployee360"
  | "viewTalentPipeline"
  | "successionPlanningPoint"
  | "manageAccessPoint";

export const permissions: Record<Permission, readonly UserRole[]> = {
  exportCharts: ["hrbp"],
  manageTalentPipeline: ["hrbp"],
  manageEmployeeStatus: ["hrbp"],
  manageNamelist: ["hrbp"],
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