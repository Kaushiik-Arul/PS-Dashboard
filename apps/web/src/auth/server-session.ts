import "server-only";
import { cookies } from "next/headers";
import type { UserRole } from "./roles";

export type ServerAuthUser = {
  accountId: string;
  persNo: string | null;
  displayName: string;
  loginEmail: string;
  role: UserRole;
  roles: UserRole[];
  mustChangePassword: boolean;
};

function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_BASE_URL?.trim();
  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("API_BASE_URL is required in production");
    }
    return "http://127.0.0.1:3001/api/v1";
  }
  return new URL(configuredUrl).toString().replace(/\/$/, "");
}

export async function getSessionHeaders(): Promise<Record<string, string>> {
  const cookieHeader = (await cookies()).toString();
  return cookieHeader ? { Cookie: cookieHeader } : {};
}

export async function getServerAuthUser(): Promise<ServerAuthUser | null> {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()) },
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Session API request failed with status ${response.status}`);
  }
  return response.json() as Promise<ServerAuthUser>;
}