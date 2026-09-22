import { forwardNamelistRequest, namelistErrorResponse } from "@/features/hrbp-point/namelist-import.api";

type Context = { params: Promise<{ previewId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { previewId } = await params;
    const query = new URL(request.url).search;
    const response = await forwardNamelistRequest(`/previews/${encodeURIComponent(previewId)}/rows${query}`);
    return Response.json(await response.json());
  } catch (error) { return namelistErrorResponse(error, "Unable to load namelist preview"); }
}