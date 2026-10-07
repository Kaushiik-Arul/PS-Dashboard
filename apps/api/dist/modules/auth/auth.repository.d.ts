import { DatabaseService } from '../../database/database.service';
import type { AuthenticatedUser, RequestMetadata, UserRole } from './auth.types';
export type AccountRecord = {
    accountId: string;
    persNo: string | null;
    displayName: string;
    loginEmail: string;
    passwordHash: string;
    mustChangePassword: boolean;
    accountStatus: 'active' | 'inactive';
    role: UserRole;
    roles: UserRole[];
};
export declare class AuthRepository {
    private readonly database;
    constructor(database: DatabaseService);
    findAccountByEmail(email: string): Promise<AccountRecord | null>;
    recordFailedLogin(accountId: string): Promise<void>;
    createSession(account: AccountRecord, tokenHash: Buffer, csrfTokenHash: Buffer, expiresAt: Date, metadata: RequestMetadata): Promise<string>;
    findActiveSession(tokenHash: Buffer): Promise<AuthenticatedUser | null>;
    changePasswordAndRotateSession(user: AuthenticatedUser, passwordHash: string, tokenHash: Buffer, csrfTokenHash: Buffer, expiresAt: Date, metadata: RequestMetadata): Promise<string>;
    getPasswordHash(accountId: string): Promise<string | null>;
    revokeSession(user: AuthenticatedUser, metadata: RequestMetadata): Promise<void>;
    private insertAudit;
}
