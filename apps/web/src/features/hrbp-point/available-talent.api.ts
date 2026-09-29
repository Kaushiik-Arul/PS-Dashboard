import "server-only";
import { getSessionHeaders } from "@/auth/server-session";

class AvailableApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: unknown = [],
  ) {
    super(message);
  }
}

export async function forwardAvailable(path: string, init: RequestInit = {}) {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production")
    throw new Error("API_BASE_URL is required");
  const base = configured
    ? new URL(configured).toString().replace(/\/$/, "")
    : "http://127.0.0.1:3001/api/v1";
  const response = await fetch(`${base}/hrbp-point/available-talent${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(await getSessionHeaders()),
      ...init.headers,
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
      issues?: unknown;
    } | null;
    throw new AvailableApiError(
      Array.isArray(body?.message)
        ? body.message.join(" ")
        : body?.message || "STEP-Available Talent request failed.",
      response.status,
      body?.issues,
    );
  }
  return response;
}
export function availableError(error: unknown) {
  if (error instanceof AvailableApiError)
    return Response.json(
      { message: error.message, issues: error.issues },
      { status: error.status },
    );
  return Response.json(
    { message: "Unable to load STEP-Available Talent." },
    { status: 500 },
  );
}
