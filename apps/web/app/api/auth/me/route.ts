import { proxyAuthRequest } from "../_proxy";

export function GET(request: Request) {
  return proxyAuthRequest(request, "/auth/me");
}