import type { Request, Response } from 'express';
export declare const csrfCookieName = "ps_csrf";
export declare function getSessionCookieName(isProduction: boolean): string;
export declare function readCookie(request: Request, name: string): string | null;
export declare function setAuthCookies(response: Response, isProduction: boolean, sessionToken: string, csrfToken: string, maxAge: number): void;
export declare function clearAuthCookies(response: Response, isProduction: boolean): void;
