import { forwardRbinExceptionsRequest, rbinExceptionsErrorResponse } from "@/features/hrbp-point/rbin-exceptions.api";

type Context = { params: Promise<{ exceptionId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { exceptionId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinExceptionsRequest(`/${encodeURIComponent(exceptionId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json());
  } catch (error) { return rbinExceptionsErrorResponse(error, "Unable to update employee exception"); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { exceptionId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    await forwardRbinExceptionsRequest(`/${encodeURIComponent(exceptionId)}`, {
      method: "DELETE",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    });
    return new Response(null, { status: 204 });
  } catch (error) { return rbinExceptionsErrorResponse(error, "Unable to delete employee exception"); }
}