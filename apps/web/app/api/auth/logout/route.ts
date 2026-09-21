import { proxyAuthRequest } from "../_proxy";

export function POST(request: Request) {
  return proxyAuthRequest(request, "/auth/logout");
}