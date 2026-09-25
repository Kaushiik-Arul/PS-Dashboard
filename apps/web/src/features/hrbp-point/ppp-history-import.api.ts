import "server-only";
import { getSessionHeaders } from "@/auth/server-session";

export class PppHistoryImportApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function getApiBaseUrl() {
  const configuredUrl = process.env.API_BASE_URL?.trim();
  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") throw new Error("API_BASE_URL is required in production");
    return "http://127.0.0.1:3001/api/v1";
  }
  return new URL(configuredUrl).toString().replace(/\/$/, "");
}

export async function forwardPppHistoryRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${getApiBaseUrl()}/hrbp-point/ppp-history-imports${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    let message = "PPP history import request failed";
    try {
      const body = await response.json() as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join(" ") : body.message ?? message;
    } catch { /* Keep the upstream fallback. */ }
    throw new PppHistoryImportApiError(message, response.status);
  }
  return response;
}

export function pppHistoryErrorResponse(error: unknown, fallback: string) {
  if (error instanceof PppHistoryImportApiError) return Response.json({ message: error.message }, { status: error.status });
  return Response.json({ message: fallback }, { status: 500 });
}
