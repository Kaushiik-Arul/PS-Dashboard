import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import type {
  SuccessionPlanningHistoryState,
  SuccessionPlanningQueryFilters,
  SuccessionPlanningResponse,
} from "./succession-planning.types";

export class SuccessionPlanningApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function apiBaseUrl() {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("API_BASE_URL is required in production");
  return configured ? new URL(configured).toString().replace(/\/$/, "") : "http://127.0.0.1:3001/api/v1";
}

export async function forwardSuccessionPlanningRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl()}/succession-planning${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new SuccessionPlanningApiError(body?.message ?? "Succession Planning request failed.", response.status);
  }
  return response;
}

export async function getSuccessionPlanningRegister(
  filters: SuccessionPlanningQueryFilters = {},
): Promise<SuccessionPlanningResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (key !== "reportingMonth" && value) searchParams.set(key, value);
  });
  const response = await forwardSuccessionPlanningRequest(searchParams.size ? `?${searchParams}` : "");
  return response.json() as Promise<SuccessionPlanningResponse>;
}

export async function getSuccessionPlanningHistoryState(): Promise<SuccessionPlanningHistoryState> {
  const response = await forwardSuccessionPlanningRequest("/history");
  return response.json() as Promise<SuccessionPlanningHistoryState>;
}

export async function getSuccessionPlanningSnapshot(reportingMonth: string): Promise<SuccessionPlanningResponse> {
  const response = await forwardSuccessionPlanningRequest(`/history/${encodeURIComponent(reportingMonth)}`);
  return response.json() as Promise<SuccessionPlanningResponse>;
}
