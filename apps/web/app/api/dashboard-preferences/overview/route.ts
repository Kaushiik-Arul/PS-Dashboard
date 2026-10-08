import {
  DashboardPreferenceApiError,
  forwardOverviewPreferenceRequest,
} from "@/features/custom-overview/custom-overview.api";

async function forward(request: Request, method: "PUT" | "DELETE") {
  try {
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardOverviewPreferenceRequest({
      method,
      headers: {
        ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      },
      ...(method === "PUT" ? { body: JSON.stringify(await request.json()) } : {}),
    });
    return Response.json(await response.json());
  } catch (error) {
    if (error instanceof DashboardPreferenceApiError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    return Response.json({ message: "Unable to update Overview preferences" }, { status: 500 });
  }
}

export function PUT(request: Request) {
  return forward(request, "PUT");
}

export function DELETE(request: Request) {
  return forward(request, "DELETE");
}
