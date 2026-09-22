import { forwardRbinCleaningRequest, rbinCleaningErrorResponse } from "@/features/hrbp-point/rbin-cleaning.api";

type Context = { params: Promise<{ batchId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { batchId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinCleaningRequest(`/batches/${encodeURIComponent(batchId)}/export`, {
      method: "POST",
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
    });
    const headers = new Headers();
    for (const name of ["content-type", "content-disposition", "content-length"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, { headers });
  } catch (error) { return rbinCleaningErrorResponse(error, "Unable to export RBIN cleaning batch"); }
}