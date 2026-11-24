import { forwardMrmRequest, MrmApiError } from "@/features/mrm/mrm.api";

export async function POST(request: Request) {
  try {
    const csrf = request.headers.get("x-csrf-token");
    const response = await forwardMrmRequest("/pul-value", {
      method: "POST", body: await request.formData(),
      headers: csrf ? { "X-CSRF-Token": csrf } : undefined,
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof MrmApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Unable to read the PUL file." }, { status });
  }
}
