import { forwardPppHistoryRequest, pppHistoryErrorResponse } from "@/features/hrbp-point/ppp-history-import.api";

type Context = { params: Promise<{ previewId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { previewId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardPppHistoryRequest(`/previews/${encodeURIComponent(previewId)}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json());
  } catch (error) { return pppHistoryErrorResponse(error, "Unable to import PPP history"); }
}