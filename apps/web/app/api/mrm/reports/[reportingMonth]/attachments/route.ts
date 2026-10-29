import { forwardMrmRequest, MrmApiError } from "@/features/mrm/mrm.api";

export async function POST(request: Request, context: { params: Promise<{ reportingMonth: string }> }) {
  const { reportingMonth } = await context.params;
  try {
    const response = await forwardMrmRequest(`/reports/${encodeURIComponent(reportingMonth)}/attachments`, {
      method: "POST", body: await request.formData(),
      headers: request.headers.get("x-csrf-token") ? { "X-CSRF-Token": request.headers.get("x-csrf-token")! } : undefined,
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof MrmApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Unable to upload attachment." }, { status });
  }
}