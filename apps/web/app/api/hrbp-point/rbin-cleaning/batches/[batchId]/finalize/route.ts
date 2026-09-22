import { forwardRbinCleaningRequest, rbinCleaningErrorResponse } from "@/features/hrbp-point/rbin-cleaning.api";

type Context = { params: Promise<{ batchId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { batchId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinCleaningRequest(`/batches/${encodeURIComponent(batchId)}/finalize`, {
      method: "POST",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    });
    return Response.json(await response.json());
  } catch (error) { return rbinCleaningErrorResponse(error, "Unable to finalize RBIN cleaning batch"); }
}