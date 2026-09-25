import { employee360ErrorResponse, forwardCareerJourneyRequest } from "@/features/employee-360/employee-360.api";

type Context = { params: Promise<{ persNo: string; eventId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { persNo, eventId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardCareerJourneyRequest(`/${encodeURIComponent(persNo)}/career-journey/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json());
  } catch (error) { return employee360ErrorResponse(error, "Unable to update Career Journey event"); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { persNo, eventId } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    await forwardCareerJourneyRequest(`/${encodeURIComponent(persNo)}/career-journey/${encodeURIComponent(eventId)}`, {
      method: "DELETE", headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    });
    return new Response(null, { status: 204 });
  } catch (error) { return employee360ErrorResponse(error, "Unable to delete Career Journey event"); }
}