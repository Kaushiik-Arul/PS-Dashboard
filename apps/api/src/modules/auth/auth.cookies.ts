import type { CookieOptions, Request, Response } from 'express';

const developmentSessionCookie = 'ps_session';
const productionSessionCookie = '__Host-ps_session';
export const csrfCookieName = 'ps_csrf';

export function getSessionCookieName(isProduction: boolean): string {
  return isProduction ? productionSessionCookie : developmentSessionCookie;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(part.slice(separator + 1));
  }

  return null;
}

function cookieOptions(isProduction: boolean, maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

export function setAuthCookies(
  response: Response,
  isProduction: boolean,
  sessionToken: string,
  csrfToken: string,
  maxAge: number,
): void {
  response.cookie(
    getSessionCookieName(isProduction),
    sessionToken,
    cookieOptions(isProduction, maxAge),
  );
  response.cookie(csrfCookieName, csrfToken, {
    ...cookieOptions(isProduction, maxAge),
    httpOnly: false,
  });
}

export function clearAuthCookies(
  response: Response,
  isProduction: boolean,
): void {
  response.clearCookie(
    getSessionCookieName(isProduction),
    cookieOptions(isProduction),
  );
  response.clearCookie(csrfCookieName, {
    ...cookieOptions(isProduction),
    httpOnly: false,
  });
}