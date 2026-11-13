import { getCsrfToken } from '@/auth/csrf';
import type { AttritionValues } from './attrition-import.types';
import type { PsExitCommitResult, PsExitPreview, PsExitPreviewFilter } from './ps-exit-import.types';

async function request(path: string, init?: RequestInit) {
  const csrf = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/ps-exit-imports${path}`, {
    ...init,
    headers: { ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    throw new Error(message ?? 'PS Exit import request failed.');
  }
  return response;
}

export const psExitImportClient = {
  async upload(file: File): Promise<PsExitPreview> {
    const body = new FormData();
    body.set('file', file);
    return request('/previews', { method: 'POST', body }).then((response) => response.json() as Promise<PsExitPreview>);
  },
  preview(id: string, filter: PsExitPreviewFilter, period: string, page: number): Promise<PsExitPreview> {
    const query = new URLSearchParams({ filter, period, page: String(page) });
    return request(`/previews/${encodeURIComponent(id)}/rows?${query}`).then((response) => response.json() as Promise<PsExitPreview>);
  },
  async updateRow(id: string, rowNumber: number, values: AttritionValues) {
    await request(`/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }),
    });
  },
  async deleteRow(id: string, rowNumber: number) {
    await request(`/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, { method: 'DELETE' });
  },
  async cancel(id: string) {
    await request(`/previews/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  commit(id: string, period: string): Promise<PsExitCommitResult> {
    return request(`/previews/${encodeURIComponent(id)}/commit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: true, period }),
    }).then((response) => response.json() as Promise<PsExitCommitResult>);
  },
};