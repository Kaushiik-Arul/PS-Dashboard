function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_BASE_URL?.trim();

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("API_BASE_URL is required in production");
    }
    return "http://127.0.0.1:3001/api/v1";
  }

  const url = new URL(configuredUrl);
  if (url.username || url.password) {
    throw new Error("API_BASE_URL must not contain credentials");
  }
  return url.toString().replace(/\/$/, "");
}

export async function proxyAuthRequest(
  request: Request,
  path: string,
): Promise<Response> {
  const body = request.method === "GET" ? undefined : await request.text();
  const upstream = await fetch(`${getApiBaseUrl()}${path}`, {
    method: request.method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(request.headers.get("cookie")
        ? { Cookie: request.headers.get("cookie")! }
        : {}),
      ...(request.headers.get("x-csrf-token")
        ? { "X-CSRF-Token": request.headers.get("x-csrf-token")! }
        : {}),
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  const headers = new Headers({
    "Cache-Control": "private, no-store",
  });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  for (const cookie of upstream.headers.getSetCookie()) {
    headers.append("Set-Cookie", cookie);
  }

  return new Response(
    upstream.status === 204 ? null : await upstream.arrayBuffer(),
    { status: upstream.status, headers },
  );
}