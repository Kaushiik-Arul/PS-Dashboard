import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import {
  customOverviewWidgetIds,
  type CustomOverviewPreference,
  type CustomOverviewWidgetId,
} from "./custom-overview.types";

export class DashboardPreferenceApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function apiBaseUrl() {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("API_BASE_URL is required in production");
  return configured ? new URL(configured).toString().replace(/\/$/, "") : "http://127.0.0.1:3001/api/v1";
}

export async function forwardOverviewPreferenceRequest(init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl()}/dashboard-preferences/overview`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new DashboardPreferenceApiError(body?.message ?? "Overview preference request failed", response.status);
  }
  return response;
}

function parsePreference(value: unknown): CustomOverviewPreference {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Overview preference response is invalid");
  const source = value as Record<string, unknown>;
  if (!Array.isArray(source.widgetIds) || typeof source.isDefault !== "boolean") throw new Error("Overview preference response is invalid");
  const supported = new Set<string>(customOverviewWidgetIds);
  const widgetIds = source.widgetIds.filter((id): id is CustomOverviewWidgetId => typeof id === "string" && supported.has(id));
  return { widgetIds: [...new Set(widgetIds)], isDefault: source.isDefault };
}

export async function getCustomOverviewPreference(): Promise<CustomOverviewPreference> {
  const response = await forwardOverviewPreferenceRequest();
  return parsePreference(await response.json());
}
