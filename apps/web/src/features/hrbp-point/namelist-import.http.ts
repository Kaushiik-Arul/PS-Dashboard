import { getCsrfToken } from "@/auth/csrf";
import type { NamelistExportMonth, NamelistImportClient, NamelistPreview, NamelistPreviewRow, PreviewFilter } from "./namelist-import.types";

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

async function downloadResponse(response: Response): Promise<{ fileName: string }> {
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName = disposition.match(/filename="([^"]+)"/i)?.[1] ?? "PS_Namelist.xlsx";
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return { fileName };
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
  async listExportMonths() {
    return request("/export-months").then((response) => response.json() as Promise<NamelistExportMonth[]>);
  },
  async exportNamelist(reportingMonth, columns) {
    const response = await request("/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportingMonth, columns }),
    });
    return downloadResponse(response);
  },
};