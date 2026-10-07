import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthRepository, type AccountRecord } from './auth.repository';
import type { AuthenticatedUser, RequestMetadata } from './auth.types';

const sessionLifetimeMilliseconds = 8 * 60 * 60 * 1000;
const passwordHashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export type SessionCredentials = {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
};

export type SessionResult = SessionCredentials & {
  user: AuthenticatedUser;
};

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}

function createCredentials(): SessionCredentials {
  return {
    sessionToken: randomBytes(32).toString('base64url'),
    csrfToken: randomBytes(32).toString('base64url'),
    expiresAt: new Date(Date.now() + sessionLifetimeMilliseconds),
  };
}

function publicUser(account: AccountRecord, sessionId: string, csrfTokenHash: Buffer): AuthenticatedUser {
  return {
    accountId: account.accountId,
    persNo: account.persNo,
    displayName: account.displayName,
    loginEmail: account.loginEmail,
    role: account.role,
    roles: account.roles,
    mustChangePassword: account.mustChangePassword,
    sessionId,
    csrfTokenHash,
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async hashTemporaryPassword(value: unknown): Promise<string> {
    if (typeof value !== 'string' || value.length < 12 || value.length > 1024) {
      throw new BadRequestException(
        'Temporary password must contain between 12 and 1024 characters',
      );
    }
    return argon2.hash(value, passwordHashOptions);
  }

  async login(input: unknown, metadata: RequestMetadata): Promise<SessionResult> {
    const { email, password } = this.parseLogin(input);
    const account = await this.repository.findAccountByEmail(email);

    if (!account || account.accountStatus === 'inactive') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(account.passwordHash, password);
    if (!passwordMatches) {
      await this.repository.recordFailedLogin(account.accountId);
      throw new UnauthorizedException('Invalid email or password');
    }

    const credentials = createCredentials();
    const csrfTokenHash = hashToken(credentials.csrfToken);
    const sessionId = await this.repository.createSession(
      account,
      hashToken(credentials.sessionToken),
      csrfTokenHash,
      credentials.expiresAt,
      metadata,
    );

    return {
      ...credentials,
      user: publicUser(account, sessionId, csrfTokenHash),
    };
  }

  authenticate(sessionToken: string | null): Promise<AuthenticatedUser | null> {
    if (!sessionToken) return Promise.resolve(null);
    return this.repository.findActiveSession(hashToken(sessionToken));
  }

  validateCsrf(user: AuthenticatedUser, cookieToken: string | null, headerToken: string | undefined): void {
    if (!cookieToken || !headerToken) {
      throw new UnauthorizedException('CSRF validation failed');
    }

    const cookieHash = hashToken(cookieToken);
    const headerHash = hashToken(headerToken);
    if (
      cookieHash.length !== headerHash.length ||
      !timingSafeEqual(cookieHash, headerHash) ||
      cookieHash.length !== user.csrfTokenHash.length ||
      !timingSafeEqual(cookieHash, user.csrfTokenHash)
    ) {
      throw new UnauthorizedException('CSRF validation failed');
    }
  }

  async changePassword(
    user: AuthenticatedUser,
    input: unknown,
    metadata: RequestMetadata,
  ): Promise<SessionResult> {
    const { currentPassword, newPassword } = this.parsePasswordChange(input);
    const currentHash = await this.repository.getPasswordHash(user.accountId);

    if (!currentHash || !(await argon2.verify(currentHash, currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (await argon2.verify(currentHash, newPassword)) {
      throw new BadRequestException('New password must be different');
    }

    const nextHash = await argon2.hash(newPassword, passwordHashOptions);
    const credentials = createCredentials();
    const csrfTokenHash = hashToken(credentials.csrfToken);
    const sessionId = await this.repository.changePasswordAndRotateSession(
      user,
      nextHash,
      hashToken(credentials.sessionToken),
      csrfTokenHash,
      credentials.expiresAt,
      metadata,
    );

    return {
      ...credentials,
      user: {
        ...user,
        mustChangePassword: false,
        sessionId,
        csrfTokenHash,
      },
    };
  }

  logout(user: AuthenticatedUser, metadata: RequestMetadata): Promise<void> {
    return this.repository.revokeSession(user, metadata);
  }

  private parseLogin(input: unknown): { email: string; password: string } {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new BadRequestException('Email and password are required');
    }

    const source = input as Record<string, unknown>;
    const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
    const password = typeof source.password === 'string' ? source.password : '';

    if (!email || email.length > 320 || !password || password.length > 1024) {
      throw new BadRequestException('Email and password are required');
    }

    return { email, password };
  }

  private parsePasswordChange(input: unknown): {
    currentPassword: string;
    newPassword: string;
  } {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new BadRequestException('Current and new passwords are required');
    }

    const source = input as Record<string, unknown>;
    const currentPassword =
      typeof source.currentPassword === 'string' ? source.currentPassword : '';
    const newPassword =
      typeof source.newPassword === 'string' ? source.newPassword : '';

    if (!currentPassword || newPassword.length < 12 || newPassword.length > 1024) {
      throw new BadRequestException(
        'New password must contain between 12 and 1024 characters',
      );
    }

    return { currentPassword, newPassword };
  }
}