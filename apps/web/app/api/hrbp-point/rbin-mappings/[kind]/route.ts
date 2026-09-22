import { forwardRbinMappingsRequest, rbinMappingsErrorResponse } from "@/features/hrbp-point/rbin-mappings.api";

type Context = { params: Promise<{ kind: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { kind } = await params;
    const query = new URL(request.url).search;
    const response = await forwardRbinMappingsRequest(`/${encodeURIComponent(kind)}${query}`);
    return Response.json(await response.json());
  } catch (error) { return rbinMappingsErrorResponse(error, "Unable to load RBIN mappings"); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { kind } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinMappingsRequest(`/${encodeURIComponent(kind)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return rbinMappingsErrorResponse(error, "Unable to create RBIN mapping"); }
}