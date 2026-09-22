import { forwardNamelistRequest, namelistErrorResponse } from "@/features/hrbp-point/namelist-import.api";

type Context = { params: Promise<{ previewId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { previewId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    await forwardNamelistRequest(`/previews/${encodeURIComponent(previewId)}`, { method: "DELETE", headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {} });
    return new Response(null, { status: 204 });
  } catch (error) { return namelistErrorResponse(error, "Unable to cancel namelist preview"); }
}