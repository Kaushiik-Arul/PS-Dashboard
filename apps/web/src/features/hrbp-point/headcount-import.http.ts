import { getCsrfToken } from "@/auth/csrf";
import type {
  HeadcountCommitResult,
  HeadcountPreview,
} from "./headcount-import.types";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const csrf = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/headcount-imports${path}`, {
    ...init,
    headers: {
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(message ?? "Monthly headcount request failed.");
  }
  return response;
}

export const headcountImportClient = {
  upload(file: File): Promise<HeadcountPreview> {
    const body = new FormData();
    body.set("file", file);
    return request("/previews", { method: "POST", body }).then(
      (response) => response.json() as Promise<HeadcountPreview>,
    );
  },
  cancel(id: string): Promise<void> {
    return request(`/previews/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).then(() => undefined);
  },
  commit(id: string, confirmReplacement: boolean): Promise<HeadcountCommitResult> {
    return request(`/previews/${encodeURIComponent(id)}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmReplacement }),
    }).then((response) => response.json() as Promise<HeadcountCommitResult>);
  },
};