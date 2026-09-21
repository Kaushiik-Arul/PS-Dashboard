import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("ps_session") ||
    request.cookies.has("__Host-ps_session");
  const { pathname, search } = request.nextUrl;

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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};