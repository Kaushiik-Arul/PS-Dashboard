import { proxyAuthRequest } from "../_proxy";

export function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") {
    return Response.json(
      { message: "Content-Type must be application/json" },
      { status: 415, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return proxyAuthRequest(request, "/auth/login");
}