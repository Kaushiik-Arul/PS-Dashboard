import {
  forwardSuccessionPlanningRequest,
  SuccessionPlanningApiError,
} from "@/features/succession-planning/succession-planning.api";

export async function POST(request: Request) {
  try {
    const csrfToken = request.headers.get("x-csrf-token");
    const response = await forwardSuccessionPlanningRequest("/snapshots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json());
  } catch (error) {
    if (error instanceof SuccessionPlanningApiError)
      return Response.json({ message: error.message }, { status: error.status });
    return Response.json(
      { message: "Unable to save Succession Planning snapshot" },
      { status: 500 },
    );
  }
}
