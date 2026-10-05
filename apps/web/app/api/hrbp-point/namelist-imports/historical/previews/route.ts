import { forwardNamelistRequest, namelistErrorResponse } from "@/features/hrbp-point/namelist-import.api";

export async function POST(request: Request) {
  try {
    const reportingMonth = new URL(request.url).searchParams.get("reportingMonth") ?? "";
    const csrfToken = request.headers.get("x-csrf-token");
    const query = new URLSearchParams({ reportingMonth });
    const response = await forwardNamelistRequest(`/historical/previews?${query}`, {
      method: "POST",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      body: await request.formData(),
    });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) {
    return namelistErrorResponse(error, "Unable to create historical Namelist preview");
  }
}
