import { getCsrfToken } from "@/auth/csrf";
import type {
  PoolPreview,
  PoolColumn,
  PoolKind,
  PoolValues,
  PoolRecord,
  PoolIssue,
} from "./pool-register.types";

export class PoolRequestError extends Error {
  constructor(
    message: string,
    readonly issues: PoolIssue[] = [],
  ) {
    super(message);
  }
}
async function request(kind: PoolKind, path: string, init?: RequestInit) {
  const csrf = getCsrfToken();
  const response = await fetch(
    `/api/hrbp-point/pool-registers/${kind}${path}`,
    {
      ...init,
      headers: { ...(csrf ? { "X-CSRF-Token": csrf } : {}), ...init?.headers },
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      issues?: PoolIssue[];
    } | null;
    throw new PoolRequestError(
      body?.message ?? "Pool data request failed.",
      body?.issues,
    );
  }
  return response;
}

export const poolClient = (kind: PoolKind) => ({
  async upload(file: File): Promise<PoolPreview> {
    const body = new FormData();
    body.set("file", file);
    const { id } = await request(kind, "/previews", {
      method: "POST",
      body,
    }).then((response) => response.json() as Promise<{ id: string }>);
    return this.preview(id, "all", 1);
  },
  preview(
    id: string,
    filter: "all" | "valid" | "warning" | "invalid",
    page: number,
  ): Promise<PoolPreview> {
    return request(
      kind,
      `/previews/${encodeURIComponent(id)}/rows?${new URLSearchParams({ filter, page: String(page) })}`,
    ).then((response) => response.json() as Promise<PoolPreview>);
  },
  async cancel(id: string) {
    await request(kind, `/previews/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  async updateRow(
    id: string,
    rowNumber: number,
    values: Record<PoolColumn, string>,
  ) {
    await request(
      kind,
      `/previews/${encodeURIComponent(id)}/rows/${rowNumber}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      },
    );
  },
  async deleteRow(id: string, rowNumber: number) {
    await request(
      kind,
      `/previews/${encodeURIComponent(id)}/rows/${rowNumber}`,
      { method: "DELETE" },
    );
  },
  commit(id: string) {
    return request(kind, `/previews/${encodeURIComponent(id)}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmReplacement: true }),
    }).then(
      (response) =>
        response.json() as Promise<{
          importedRows: number;
          replacedRows: number;
        }>,
    );
  },
  list(signal?: AbortSignal): Promise<PoolRecord[]> {
    return request(kind, "", { signal }).then((response) => response.json());
  },
  lookup(persNo: string): Promise<{ employee: Partial<PoolValues> | null }> {
    return request(kind, `/employees/${encodeURIComponent(persNo)}`).then(
      (response) => response.json(),
    );
  },
  save(
    values: PoolValues,
    id?: string,
  ): Promise<{ id: string; issues: PoolIssue[] }> {
    return request(kind, `/rows${id ? "/" + encodeURIComponent(id) : ""}`, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }).then((response) => response.json());
  },
  async remove(id: string) {
    await request(kind, `/rows/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
});
