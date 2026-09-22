import { forwardRbinCleaningRequest, rbinCleaningErrorResponse } from "@/features/hrbp-point/rbin-cleaning.api";

type Context = { params: Promise<{ batchId: string; rowNumber: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { batchId, rowNumber } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinCleaningRequest(
      `/batches/${encodeURIComponent(batchId)}/rows/${encodeURIComponent(rowNumber)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
        body: JSON.stringify(await request.json()),
      },
    );
    return Response.json(await response.json());
  } catch (error) { return rbinCleaningErrorResponse(error, "Unable to update RBIN staged row"); }
}