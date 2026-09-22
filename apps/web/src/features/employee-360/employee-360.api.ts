import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import type { Employee360Query, Employee360Response } from "./employee-360.types";

function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_BASE_URL?.trim();
  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("API_BASE_URL is required in production");
    }
    return "http://127.0.0.1:3001/api/v1";
  }
  const url = new URL(configuredUrl);
  if (url.username || url.password) {
    throw new Error("API_BASE_URL must not contain credentials");
  }
  return url.toString().replace(/\/$/, "");
}

export async function getEmployee360(
  query: Employee360Query = {},
): Promise<Employee360Response> {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const suffix = searchParams.size ? `?${searchParams.toString()}` : "";
  const response = await fetch(`${getApiBaseUrl()}/employee-360${suffix}`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Employee 360 API request failed with status ${response.status}`);
  }
  return response.json() as Promise<Employee360Response>;
}