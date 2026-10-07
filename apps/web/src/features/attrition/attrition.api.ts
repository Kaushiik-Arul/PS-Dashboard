import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import type { AttritionQueryFilters, AttritionResponse } from "./attrition.types";

export class AttritionApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function apiBaseUrl() {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("API_BASE_URL is required in production");
  return configured ? new URL(configured).toString().replace(/\/$/, "") : "http://127.0.0.1:3001/api/v1";
}

export async function forwardAttritionRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl()}/attrition${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new AttritionApiError(body?.message ?? "Attrition request failed.", response.status);
  }
  return response;
}

export async function getAttritionRegister(
  filters: AttritionQueryFilters = {},
): Promise<AttritionResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const response = await forwardAttritionRequest(searchParams.size ? `?${searchParams}` : "");
  return response.json() as Promise<AttritionResponse>;
}