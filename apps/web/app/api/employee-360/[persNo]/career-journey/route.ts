import { employee360ErrorResponse, forwardCareerJourneyRequest } from "@/features/employee-360/employee-360.api";

type Context = { params: Promise<{ persNo: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { persNo } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardCareerJourneyRequest(`/${encodeURIComponent(persNo)}/career-journey`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return employee360ErrorResponse(error, "Unable to create Career Journey event"); }
}