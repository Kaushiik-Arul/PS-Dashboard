export const managedRoles = [
  "admin",
  "range_head",
  "department_head",
  "sub_department_head",
] as const;

export type ManagedRole = (typeof managedRoles)[number];

export const managedRoleLabels: Record<ManagedRole, string> = {
  admin: "Administrator",
  range_head: "Range Head",
  department_head: "Department Head",
  sub_department_head: "Sub-department Head",
};

export interface EmployeeCandidate {
  persNo: string;
  employeeName: string;
  email: string | null;
  range: string | null;
  orgUnit: string | null;
  designation: string | null;
  hasAccount: boolean;
}

export interface AccessAssignment {
  assignmentId: string;
  accountId: string;
  persNo: string;
  employeeName: string;
  email: string;
  accountStatus: "active" | "inactive" | "locked";
  mustChangePassword: boolean;
  role: ManagedRole;
  assignedRange: string | null;
  assignedOrgUnit: string | null;
  updatedAt: string;
}

export interface ScopeOptions {
  ranges: string[];
  orgUnits: string[];
}
