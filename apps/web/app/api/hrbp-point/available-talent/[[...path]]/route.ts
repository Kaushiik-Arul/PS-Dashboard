import {
  forwardAvailable,
  availableError,
} from "@/features/hrbp-point/available-talent.api";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: Request, context: Context) {
  const { path = [] } = await context.params;
  const suffix = path.join("/");
  const allowed =
    suffix === "" ||
    /^employees\/[1-9]\d*$/.test(suffix) ||
    /^rows(?:\/[a-f0-9-]+)?$/i.test(suffix) ||
    /^previews(?:\/[a-f0-9-]+(?:\/(?:commit|rows(?:\/\d+)?))?)?$/i.test(suffix);
  if (!allowed)
    return Response.json(
      { message: "Unknown register endpoint." },
      { status: 404 },
    );
  try {
    const headers: Record<string, string> = {};
    const csrf = request.headers.get("x-csrf-token");
    if (csrf) headers["X-CSRF-Token"] = csrf;
    const init: RequestInit = { method: request.method, headers };
    if (request.method === "POST" && suffix === "previews")
      init.body = await request.formData();
    else if (request.method === "POST" || request.method === "PATCH") {
      headers["Content-Type"] = "application/json";
      init.body = await request.text();
    }
    const response = await forwardAvailable(
      `${suffix ? "/" + suffix : ""}${new URL(request.url).search}`,
      init,
    );
    return response.status === 204
      ? new Response(null, { status: 204 })
      : Response.json(await response.json(), { status: response.status });
  } catch (error) {
    return availableError(error);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
