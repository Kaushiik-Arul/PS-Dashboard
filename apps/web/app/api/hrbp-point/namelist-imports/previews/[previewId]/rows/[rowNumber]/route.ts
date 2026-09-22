import { forwardNamelistRequest, namelistErrorResponse } from "@/features/hrbp-point/namelist-import.api";

type Context = { params: Promise<{ previewId: string; rowNumber: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { previewId, rowNumber } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardNamelistRequest(`/previews/${encodeURIComponent(previewId)}/rows/${encodeURIComponent(rowNumber)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json());
  } catch (error) { return namelistErrorResponse(error, "Unable to update namelist row"); }
}