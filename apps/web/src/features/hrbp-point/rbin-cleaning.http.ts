import { getCsrfToken } from "@/auth/csrf";
import type {
  RbinBatchSummary,
  RbinCleaningClient,
  RbinPreviewPage,
  RbinPreviewRow,
  RbinRowFilter,
} from "./rbin-cleaning.types";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const csrfToken = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/rbin-cleaning${path}`, {
    ...init,
    headers: { ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "The RBIN cleaning request could not be completed.");
  }
  return response;
}

async function getRows(batchId: string, filter: RbinRowFilter, page: number, pageSize: number, search: string): Promise<RbinPreviewPage> {
  const query = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) });
  if (search) query.set("search", search);
  return request(`/batches/${encodeURIComponent(batchId)}/rows?${query}`).then(
    (response) => response.json() as Promise<RbinPreviewPage>,
  );
}

async function downloadResponse(response: Response): Promise<{ fileName: string; exportedAt: string }> {
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName = disposition.match(/filename="([^"]+)"/i)?.[1] ?? "PS_Namelist_Cleaned.xlsx";
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return { fileName, exportedAt: new Date().toISOString() };
}

export const httpRbinCleaningClient: RbinCleaningClient = {
  listBatches() {
    return request("/batches").then((response) => response.json() as Promise<RbinBatchSummary[]>);
  },
  async createPreview(file, pageSize) {
    const formData = new FormData();
    formData.set("file", file);
    const summary = await request("/batches", { method: "POST", body: formData }).then(
      (response) => response.json() as Promise<RbinBatchSummary>,
    );
    return getRows(summary.id, "all", 1, pageSize, "");
  },
  getRows,
  async updateRow(batchId, row: RbinPreviewRow, filter, page, pageSize, search) {
    await request(`/batches/${encodeURIComponent(batchId)}/rows/${row.rowNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row.values),
    });
    return getRows(batchId, filter, page, pageSize, search);
  },
  async finalize(batchId, pageSize) {
    await request(`/batches/${encodeURIComponent(batchId)}/finalize`, { method: "POST" });
    return getRows(batchId, "all", 1, pageSize, "");
  },
  async exportBatch(batchId) {
    const response = await request(`/batches/${encodeURIComponent(batchId)}/export`, { method: "POST" });
    return downloadResponse(response);
  },
};