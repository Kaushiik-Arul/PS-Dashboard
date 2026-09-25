import { forwardPppHistoryRequest, pppHistoryErrorResponse } from "@/features/hrbp-point/ppp-history-import.api";

export async function POST(request: Request) {
  try {
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardPppHistoryRequest("/previews", {
      method: "POST",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      body: await request.formData(),
    });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return pppHistoryErrorResponse(error, "Unable to create PPP history preview"); }
}
