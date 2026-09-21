export declare const managedRoles: readonly ["admin", "range_head", "department_head", "sub_department_head"];
export type ManagedRole = (typeof managedRoles)[number];
export declare class EmployeeCandidateDto {
    persNo: string;
    employeeName: string;
    email: string | null;
    range: string | null;
    orgUnit: string | null;
    designation: string | null;
    hasAccount: boolean;
}
export declare class AccessAssignmentDto {
    assignmentId: string;
    accountId: string;
    persNo: string;
    employeeName: string;
    email: string;
    accountStatus: 'active' | 'inactive' | 'locked';
    mustChangePassword: boolean;
    role: ManagedRole;
    assignedRange: string | null;
    assignedOrgUnit: string | null;
    updatedAt: string;
}
export declare class CreateAccessAssignmentDto {
    persNo: string;
    role: ManagedRole;
    assignedRange?: string | null;
    assignedOrgUnit?: string | null;
    temporaryPassword?: string;
}
export declare class UpdateAccessAssignmentDto {
    role: ManagedRole;
    assignedRange?: string | null;
    assignedOrgUnit?: string | null;
}
