import { forwardRbinCleaningRequest, rbinCleaningErrorResponse } from "@/features/hrbp-point/rbin-cleaning.api";

export async function GET() {
  try {
    const response = await forwardRbinCleaningRequest("/batches");
    return Response.json(await response.json());
  } catch (error) { return rbinCleaningErrorResponse(error, "Unable to list RBIN cleaning batches"); }
}

export async function POST(request: Request) {
  try {
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardRbinCleaningRequest("/batches", {
      method: "POST",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      body: await request.formData(),
    });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return rbinCleaningErrorResponse(error, "Unable to create RBIN cleaning batch"); }
}