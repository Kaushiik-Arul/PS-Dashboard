import { forwardPppHistoryRequest, pppHistoryErrorResponse } from "@/features/hrbp-point/ppp-history-import.api";

type Context = { params: Promise<{ previewId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { previewId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    await forwardPppHistoryRequest(`/previews/${encodeURIComponent(previewId)}`, {
      method: "DELETE",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    });
    return new Response(null, { status: 204 });
  } catch (error) { return pppHistoryErrorResponse(error, "Unable to cancel PPP history preview"); }
}
