import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}

function authenticatedUser(csrfToken: string): AuthenticatedUser {
  return {
    accountId: 'account-id',
    persNo: null,
    displayName: 'Test User',
    loginEmail: 'test@example.com',
    role: 'hrbp',
    roles: ['hrbp'],
    mustChangePassword: false,
    sessionId: 'session-id',
    csrfTokenHash: hashToken(csrfToken),
  };
}

describe('AuthService CSRF validation', () => {
  const service = new AuthService({} as AuthRepository);
  const csrfToken = 'session-bound-csrf-token';
  const user = authenticatedUser(csrfToken);

  it('accepts a token matching the cookie, header, and session', () => {
    expect(() => service.validateCsrf(user, csrfToken, csrfToken)).not.toThrow();
  });

  it.each([
    [null, csrfToken],
    [csrfToken, undefined],
    ['different-token', csrfToken],
    [csrfToken, 'different-token'],
  ])('rejects missing or mismatched cookie and header tokens', (cookie, header) => {
    expect(() => service.validateCsrf(user, cookie, header)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects matching cookie and header tokens bound to another session', () => {
    expect(() =>
      service.validateCsrf(user, 'another-session-token', 'another-session-token'),
    ).toThrow(UnauthorizedException);
  });
});