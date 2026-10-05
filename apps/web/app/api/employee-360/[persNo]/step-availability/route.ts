import { employee360ErrorResponse, forwardEmployee360Request } from "@/features/employee-360/employee-360.api";

type Context = { params: Promise<{ persNo: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { persNo } = await params;
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardEmployee360Request(
      `/${encodeURIComponent(persNo)}/step-availability`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify(await request.json()),
      },
    );
    return Response.json(await response.json());
  } catch (error) {
    return employee360ErrorResponse(error, "Unable to update STEP availability");
  }
}