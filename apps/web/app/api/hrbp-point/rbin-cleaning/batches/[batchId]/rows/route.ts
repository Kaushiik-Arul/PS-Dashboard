import { forwardRbinCleaningRequest, rbinCleaningErrorResponse } from "@/features/hrbp-point/rbin-cleaning.api";

type Context = { params: Promise<{ batchId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { batchId } = await params;
    const query = new URL(request.url).search;
    const response = await forwardRbinCleaningRequest(`/batches/${encodeURIComponent(batchId)}/rows${query}`);
    return Response.json(await response.json());
  } catch (error) { return rbinCleaningErrorResponse(error, "Unable to load RBIN cleaning rows"); }
}