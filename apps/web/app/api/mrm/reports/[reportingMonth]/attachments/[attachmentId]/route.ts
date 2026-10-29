import { forwardMrmRequest, MrmApiError } from "@/features/mrm/mrm.api";

type Context = { params: Promise<{ reportingMonth: string; attachmentId: string }> };

export async function GET(_request: Request, context: Context) {
  const { reportingMonth, attachmentId } = await context.params;
  try {
    const response = await forwardMrmRequest(`/reports/${encodeURIComponent(reportingMonth)}/attachments/${encodeURIComponent(attachmentId)}`);
    const headers = new Headers();
    ["content-type", "content-length", "content-disposition"].forEach((name) => {
      const value = response.headers.get(name); if (value) headers.set(name, value);
    });
    headers.set("Cache-Control", "private, no-store");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const status = error instanceof MrmApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Unable to download attachment." }, { status });
  }
}

export async function DELETE(request: Request, context: Context) {
  const { reportingMonth, attachmentId } = await context.params;
  try {
    await forwardMrmRequest(`/reports/${encodeURIComponent(reportingMonth)}/attachments/${encodeURIComponent(attachmentId)}`, {
      method: "DELETE",
      headers: request.headers.get("x-csrf-token") ? { "X-CSRF-Token": request.headers.get("x-csrf-token")! } : undefined,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    const status = error instanceof MrmApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Unable to delete attachment." }, { status });
  }
}