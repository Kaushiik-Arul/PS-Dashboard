import { getCsrfToken } from "@/auth/csrf";
import type { NamelistImportClient, NamelistPreview, NamelistPreviewRow, PreviewFilter } from "./namelist-import.types";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const csrfToken = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/namelist-imports${path}`, {
    ...init,
    headers: { ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "The namelist request could not be completed.");
  }
  return response;
}

async function getRows(previewId: string, filter: PreviewFilter, page: number, pageSize: number): Promise<NamelistPreview> {
  const query = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) });
  return request(`/previews/${encodeURIComponent(previewId)}/rows?${query}`).then((response) => response.json() as Promise<NamelistPreview>);
}

export const httpNamelistImportClient: NamelistImportClient = {
  async createPreview(file, reportingMonth, importMode) {
    const formData = new FormData();
    formData.set("file", file);
    const path = importMode === "historical"
      ? `/historical/previews?${new URLSearchParams({ reportingMonth })}`
      : `/previews?${new URLSearchParams({ reportingMonth })}`;
    const summary = await request(path, { method: "POST", body: formData }).then((response) => response.json() as Promise<{ id: string }>);
    return getRows(summary.id, "all", 1, 25);
  },
  getRows,
  async updateRow(previewId, row: NamelistPreviewRow, filter, page, pageSize) {
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
    const path = preview.importMode === "historical"
      ? `/historical/previews/${encodeURIComponent(preview.id)}/commit`
      : `/previews/${encodeURIComponent(preview.id)}/commit`;
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmReplacement }),
    }).then((response) => response.json() as Promise<{ totalRows: number }>);
  },
};