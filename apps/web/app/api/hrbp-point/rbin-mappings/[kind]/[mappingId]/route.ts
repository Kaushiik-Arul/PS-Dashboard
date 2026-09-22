import { forwardRbinMappingsRequest, rbinMappingsErrorResponse } from "@/features/hrbp-point/rbin-mappings.api";

type Context = { params: Promise<{ kind: string; mappingId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { kind, mappingId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinMappingsRequest(`/${encodeURIComponent(kind)}/${encodeURIComponent(mappingId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json());
  } catch (error) { return rbinMappingsErrorResponse(error, "Unable to update RBIN mapping"); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { kind, mappingId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    await forwardRbinMappingsRequest(`/${encodeURIComponent(kind)}/${encodeURIComponent(mappingId)}`, {
      method: "DELETE",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    });
    return new Response(null, { status: 204 });
  } catch (error) { return rbinMappingsErrorResponse(error, "Unable to delete RBIN mapping"); }
}