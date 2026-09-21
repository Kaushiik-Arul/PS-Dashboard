import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import type { AccessAssignment, ScopeOptions } from "./access-point.types";

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

async function request(path: string): Promise<unknown> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Access Point API request failed");
  return response.json();
}

export async function getAccessPointData(): Promise<{
  assignments: AccessAssignment[];
  scopeOptions: ScopeOptions;
}> {
  const [assignments, scopeOptions] = await Promise.all([
    request("/access-point/assignments"),
    request("/access-point/scope-options"),
  ]);
  if (!Array.isArray(assignments)) throw new Error("Invalid assignment response");
  if (typeof scopeOptions !== "object" || scopeOptions === null) {
    throw new Error("Invalid scope response");
  }
  return {
    assignments: assignments as AccessAssignment[],
    scopeOptions: scopeOptions as ScopeOptions,
  };
}
