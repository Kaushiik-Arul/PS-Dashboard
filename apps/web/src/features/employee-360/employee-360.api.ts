import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import type { Employee360Profile, Employee360Query, Employee360Response } from "./employee-360.types";

export class Employee360ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

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

export async function getEmployee360Profile(persNo: string): Promise<Employee360Profile | null> {
  const response = await fetch(`${getApiBaseUrl()}/employee-360/${encodeURIComponent(persNo)}`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()) },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Employee 360 profile request failed with status ${response.status}`);
  return response.json() as Promise<Employee360Profile>;
}

export async function forwardCareerJourneyRequest(path: string, init: RequestInit) {
  const response = await fetch(`${getApiBaseUrl()}/employee-360${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    let message = "Career Journey request failed";
    try {
      const body = await response.json() as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join(" ") : body.message ?? message;
    } catch { /* Keep the generic upstream message. */ }
    throw new Employee360ApiError(message, response.status);
  }
  return response;
}

export function employee360ErrorResponse(error: unknown, fallback: string) {
  if (error instanceof Employee360ApiError) return Response.json({ message: error.message }, { status: error.status });
  return Response.json({ message: fallback }, { status: 500 });
}