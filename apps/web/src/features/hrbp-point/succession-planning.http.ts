import { getCsrfToken } from "@/auth/csrf";
import type {
  SuccessionPlanningColumn,
  SuccessionPlanningPreview,
  SuccessionPlanningValues,
} from "@/features/succession-planning/succession-planning.types";

async function request(path: string, init?: RequestInit) {
  const csrf = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/succession-planning${path}`, {
    ...init,
    headers: { ...(csrf ? { "X-CSRF-Token": csrf } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
    throw new Error(message ?? "Succession Planning request failed.");
  }
  return response;
}

export const successionPlanningImportClient = {
  async upload(file: File): Promise<SuccessionPlanningPreview> {
    const body = new FormData();
    body.set("file", file);
    const { id } = await request("/previews", { method: "POST", body }).then(
      (response) => response.json() as Promise<{ id: string }>,
    );
    return this.preview(id, "all", 1);
  },
  preview(id: string, filter: "all" | "warnings", page: number): Promise<SuccessionPlanningPreview> {
    const query = new URLSearchParams({ filter, page: String(page) });
    return request(`/previews/${encodeURIComponent(id)}/rows?${query}`).then(
      (response) => response.json() as Promise<SuccessionPlanningPreview>,
    );
  },
  async updateRow(id: string, rowNumber: number, values: Record<SuccessionPlanningColumn, string>) {
    await request(`/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
  },
  async deleteRow(id: string, rowNumber: number) {
    await request(`/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, { method: "DELETE" });
  },
  async cancel(id: string) {
    await request(`/previews/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  commit(id: string) {
    return request(`/previews/${encodeURIComponent(id)}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmReplacement: true }),
    }).then((response) => response.json() as Promise<{ importedRows: number; replacedRows: number }>);
  },
};

export type { SuccessionPlanningValues };
