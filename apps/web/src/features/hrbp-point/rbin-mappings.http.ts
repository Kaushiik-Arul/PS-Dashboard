import { getCsrfToken } from "@/auth/csrf";
import type {
  RbinMapping,
  RbinMappingInput,
  RbinMappingKind,
  RbinMappingPage,
  RbinMappingsClient,
} from "./rbin-mappings.types";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const csrfToken = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/rbin-mappings${path}`, {
    ...init,
    headers: { ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "The mapping request could not be completed.");
  }
  return response;
}

export const httpRbinMappingsClient: RbinMappingsClient = {
  list(kind, search, filter, page, pageSize) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) query.set("search", search);
    if (filter) query.set("filter", filter);
    return request(`/${kind}?${query}`).then((response) => response.json() as Promise<RbinMappingPage>);
  },
  create(kind: RbinMappingKind, input: RbinMappingInput) {
    return request(`/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((response) => response.json() as Promise<RbinMapping>);
  },
  update(kind: RbinMappingKind, id: string, input: RbinMappingInput) {
    return request(`/${kind}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((response) => response.json() as Promise<RbinMapping>);
  },
  async delete(kind: RbinMappingKind, id: string) {
    await request(`/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};