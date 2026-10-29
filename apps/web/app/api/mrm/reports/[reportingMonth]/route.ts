import { forwardMrmRequest, MrmApiError } from "@/features/mrm/mrm.api";

type Context = { params: Promise<{ reportingMonth: string }> };

async function proxy(request: Request, context: Context, method: "GET" | "PATCH") {
  const { reportingMonth } = await context.params;
  try {
    const response = await forwardMrmRequest(`/reports/${encodeURIComponent(reportingMonth)}`, {
      method,
      headers: method === "PATCH" ? {
        "Content-Type": "application/json",
        ...(request.headers.get("x-csrf-token") ? { "X-CSRF-Token": request.headers.get("x-csrf-token")! } : {}),
      } : undefined,
      body: method === "PATCH" ? await request.text() : undefined,
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof MrmApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "MRM request failed." }, { status });
  }
}

export function GET(request: Request, context: Context) { return proxy(request, context, "GET"); }
export function PATCH(request: Request, context: Context) { return proxy(request, context, "PATCH"); }