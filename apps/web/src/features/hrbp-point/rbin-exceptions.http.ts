import { getCsrfToken } from "@/auth/csrf";
import type { RbinException, RbinExceptionPage, RbinExceptionRuleInput, RbinExceptionsClient } from "./rbin-exceptions.types";

async function request(path: string, init?: RequestInit) {
  const csrfToken = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/rbin-exceptions${path}`, {
    ...init,
    headers: { ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "The employee exception request could not be completed.");
  }
  return response;
}

export const httpRbinExceptionsClient: RbinExceptionsClient = {
  list(search, filter, page, pageSize) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) query.set("search", search);
    if (filter) query.set("filter", filter);
    return request(`?${query}`).then((response) => response.json() as Promise<RbinExceptionPage>);
  },
  create(persNo: string, rules: RbinExceptionRuleInput[]) {
    return request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persNo, rules }) })
      .then((response) => response.json() as Promise<RbinException[]>);
  },
  update(id, input) {
    return request(`/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
      .then((response) => response.json() as Promise<RbinException>);
  },
  async delete(id) { await request(`/${encodeURIComponent(id)}`, { method: "DELETE" }); },
};