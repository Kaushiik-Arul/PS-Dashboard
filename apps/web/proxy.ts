import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set(["/login"]);
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
}

export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("ps_session") ||
    request.cookies.has("__Host-ps_session");
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!safeMethods.has(request.method) && !isSameOrigin(request)) {
      return NextResponse.json(
        { message: "Cross-site request rejected" },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.next();
  }

  if (!hasSession && !publicPaths.has(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};