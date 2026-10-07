import "server-only";
import { getSessionHeaders } from "@/auth/server-session";

class AttritionImportApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function forwardAttritionImport(path: string, init: RequestInit = {}) {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("API_BASE_URL is required");
  const base = configured ? new URL(configured).toString().replace(/\/$/, "") : "http://127.0.0.1:3001/api/v1";
  const response = await fetch(`${base}/hrbp-point/attrition${path}`, {
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
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    throw new AttritionImportApiError(
      Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Attrition import request failed.",
      response.status,
    );
  }
  return response;
}

export function attritionImportError(error: unknown) {
  if (error instanceof AttritionImportApiError)
    return Response.json({ message: error.message }, { status: error.status });
  return Response.json({ message: "Unable to process the Attrition workbook." }, { status: 500 });
}