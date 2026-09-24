import { forwardRbinExceptionsRequest, rbinExceptionsErrorResponse } from "@/features/hrbp-point/rbin-exceptions.api";

export async function GET(request: Request) {
  try {
    const response = await forwardRbinExceptionsRequest(new URL(request.url).search);
    return Response.json(await response.json());
  } catch (error) { return rbinExceptionsErrorResponse(error, "Unable to load employee exceptions"); }
}

export async function POST(request: Request) {
  try {
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinExceptionsRequest("", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return rbinExceptionsErrorResponse(error, "Unable to create employee exceptions"); }
}