import type { Request } from 'express';
export declare const userRoles: readonly ["hrbp", "admin", "range_head", "department_head", "sub_department_head"];
export type UserRole = (typeof userRoles)[number];
export type AuthenticatedUser = {
    accountId: string;
    persNo: string | null;
    displayName: string;
    loginEmail: string;
    role: UserRole;
    roles: UserRole[];
    mustChangePassword: boolean;
    sessionId: string;
    csrfTokenHash: Buffer;
};
export type AuthenticatedRequest = Request & {
    user: AuthenticatedUser;
};
export type RequestMetadata = {
    ipAddress: string | null;
    userAgent: string | null;
};
