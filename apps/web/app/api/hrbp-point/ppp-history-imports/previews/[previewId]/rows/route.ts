import { forwardPppHistoryRequest, pppHistoryErrorResponse } from "@/features/hrbp-point/ppp-history-import.api";

type Context = { params: Promise<{ previewId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { previewId } = await params;
    const response = await forwardPppHistoryRequest(`/previews/${encodeURIComponent(previewId)}/rows${new URL(request.url).search}`);
    return Response.json(await response.json());
  } catch (error) { return pppHistoryErrorResponse(error, "Unable to load PPP history preview"); }
}
