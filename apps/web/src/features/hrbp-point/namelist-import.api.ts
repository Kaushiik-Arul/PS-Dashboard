import "server-only";
import { getSessionHeaders } from "@/auth/server-session";

export class NamelistImportApiError extends Error {
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

export async function forwardNamelistRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${getApiBaseUrl()}/hrbp-point/namelist-imports${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    let message = "Namelist import request failed";
    try {
      const body = await response.json() as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      if (Array.isArray(body.message)) message = body.message.join(" ");
    } catch { /* Keep the generic upstream message. */ }
    throw new NamelistImportApiError(message, response.status);
  }
  return response;
}

export function namelistErrorResponse(error: unknown, fallback: string) {
  if (error instanceof NamelistImportApiError) return Response.json({ message: error.message }, { status: error.status });
  return Response.json({ message: fallback }, { status: 500 });
}