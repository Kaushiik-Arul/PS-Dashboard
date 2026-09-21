import { AuthRepository } from './auth.repository';
import type { AuthenticatedUser, RequestMetadata } from './auth.types';
export type SessionCredentials = {
    sessionToken: string;
    csrfToken: string;
    expiresAt: Date;
};
export type SessionResult = SessionCredentials & {
    user: AuthenticatedUser;
};
export declare class AuthService {
    private readonly repository;
    constructor(repository: AuthRepository);
    hashTemporaryPassword(value: unknown): Promise<string>;
    login(input: unknown, metadata: RequestMetadata): Promise<SessionResult>;
    authenticate(sessionToken: string | null): Promise<AuthenticatedUser | null>;
    validateCsrf(user: AuthenticatedUser, cookieToken: string | null, headerToken: string | undefined): void;
    changePassword(user: AuthenticatedUser, input: unknown, metadata: RequestMetadata): Promise<SessionResult>;
    logout(user: AuthenticatedUser, metadata: RequestMetadata): Promise<void>;
    private parseLogin;
    private parsePasswordChange;
}
