import "server-only";
import { getSessionHeaders } from "@/auth/server-session";

class PoolApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: unknown = [],
  ) {
    super(message);
  }
}

export async function forwardPool(path: string, init: RequestInit = {}) {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production")
    throw new Error("API_BASE_URL is required");
  const base = configured
    ? new URL(configured).toString().replace(/\/$/, "")
    : "http://127.0.0.1:3001/api/v1";
  const response = await fetch(`${base}/hrbp-point/pool-registers${path}`, {
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
    throw new PoolApiError(
      Array.isArray(body?.message)
        ? body.message.join(" ")
        : body?.message || "Pool register request failed.",
      response.status,
      body?.issues,
    );
  }
  return response;
}
export function poolError(error: unknown) {
  if (error instanceof PoolApiError)
    return Response.json(
      { message: error.message, issues: error.issues },
      { status: error.status },
    );
  return Response.json(
    { message: "Unable to load Pool register." },
    { status: 500 },
  );
}
