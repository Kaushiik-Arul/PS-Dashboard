import { proxyAuthRequest } from "../../auth/_proxy";

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: Request, context: Context) {
  const { path } = await context.params;
  const upstreamPath = path.map(encodeURIComponent).join("/");
  const search = new URL(request.url).search;
  return proxyAuthRequest(request, `/access-point/${upstreamPath}${search}`);
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
