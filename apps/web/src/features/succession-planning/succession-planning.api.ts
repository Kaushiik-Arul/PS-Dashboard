import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import type { SuccessionPlanningResponse } from "./succession-planning.types";

function apiBaseUrl() {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("API_BASE_URL is required in production");
  return configured ? new URL(configured).toString().replace(/\/$/, "") : "http://127.0.0.1:3001/api/v1";
}

export async function getSuccessionPlanningRegister(): Promise<SuccessionPlanningResponse> {
  const response = await fetch(`${apiBaseUrl()}/succession-planning`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Succession Planning request failed.");
  }
  return response.json() as Promise<SuccessionPlanningResponse>;
}
