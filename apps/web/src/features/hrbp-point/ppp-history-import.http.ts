import { getCsrfToken } from "@/auth/csrf";
import type { PppHistoryImportClient, PppPreview, PppPreviewFilter, PppPreviewRow } from "./ppp-history-import.types";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const csrfToken = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/ppp-history-imports${path}`, {
    ...init,
    headers: { ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "The PPP history request could not be completed.");
  }
  return response;
}

async function getRows(previewId: string, filter: PppPreviewFilter, page: number, pageSize: number): Promise<PppPreview> {
  const query = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) });
  return request(`/previews/${encodeURIComponent(previewId)}/rows?${query}`).then((response) => response.json() as Promise<PppPreview>);
}

export const httpPppHistoryImportClient: PppHistoryImportClient = {
  async createPreview(file) {
    const formData = new FormData();
    formData.set("file", file);
    const summary = await request("/previews", { method: "POST", body: formData }).then((response) => response.json() as Promise<{ id: string }>);
    return getRows(summary.id, "all", 1, 25);
  },
  getRows,
  async updateRow(previewId, row: PppPreviewRow, filter, page, pageSize) {
    await request(`/previews/${encodeURIComponent(previewId)}/rows/${row.rowNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row.values),
    });
    return getRows(previewId, filter, page, pageSize);
  },
  async cancel(previewId) {
    await request(`/previews/${encodeURIComponent(previewId)}`, { method: "DELETE" });
  },
  async commit(preview, confirmReplacement) {
    return request(`/previews/${encodeURIComponent(preview.id)}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmReplacement }),
    }).then((response) => response.json());
  },
};
