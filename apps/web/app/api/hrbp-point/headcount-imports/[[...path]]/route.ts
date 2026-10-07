import {
  forwardHeadcountImport,
  headcountImportError,
} from "@/features/hrbp-point/headcount-import.api";

type Context = { params: Promise<{ path?: string[] }> };

async function handle(request: Request, context: Context) {
  const { path = [] } = await context.params;
  const suffix = path.join("/");
  const previewId = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  const allowed =
    (request.method === "POST" && suffix === "previews") ||
    (request.method === "GET" && new RegExp(`^previews/${previewId}$`, "i").test(suffix)) ||
    (request.method === "DELETE" && new RegExp(`^previews/${previewId}$`, "i").test(suffix)) ||
    (request.method === "POST" && new RegExp(`^previews/${previewId}/commit$`, "i").test(suffix));
  if (!allowed) {
    return Response.json({ message: "Unknown headcount import endpoint." }, { status: 404 });
  }

  try {
    const headers: Record<string, string> = {};
    const csrf = request.headers.get("x-csrf-token");
    if (csrf) headers["X-CSRF-Token"] = csrf;
    const init: RequestInit = { method: request.method, headers };
    if (request.method === "POST" && suffix === "previews") {
      init.body = await request.formData();
    } else if (request.method === "POST") {
      headers["Content-Type"] = "application/json";
      init.body = await request.text();
    }
    const response = await forwardHeadcountImport(`/${suffix}`, init);
    return response.status === 204
      ? new Response(null, { status: 204 })
      : Response.json(await response.json(), { status: response.status });
  } catch (error) {
    return headcountImportError(error);
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;