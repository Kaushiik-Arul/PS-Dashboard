import { forwardRbinCleaningRequest, rbinCleaningErrorResponse } from "@/features/hrbp-point/rbin-cleaning.api";

type Context = { params: Promise<{ batchId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { batchId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinCleaningRequest(
      `/batches/${encodeURIComponent(batchId)}/mappings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify(await request.json()),
      },
    );
    return Response.json(await response.json());
  } catch (error) {
    return rbinCleaningErrorResponse(error, "Unable to save RBIN mapping");
  }
}
