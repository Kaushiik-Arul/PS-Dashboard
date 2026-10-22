import { getCsrfToken } from '@/auth/csrf';
import type {
  OrgStructureColumn,
  OrgStructurePreview,
} from './org-structure-import.types';

async function request(path: string, init?: RequestInit) {
  const csrf = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/org-structure${path}`, {
    ...init,
    headers: { ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? 'Org structure request failed.');
  }
  return response;
}

export const orgStructureImportClient = {
  async upload(file: File): Promise<OrgStructurePreview> {
    const body = new FormData();
    body.set('file', file);
    const { id } = await request('/previews', { method: 'POST', body })
      .then((response) => response.json() as Promise<{ id: string }>);
    return this.preview(id, 1);
  },
  preview(id: string, page: number): Promise<OrgStructurePreview> {
    return request(`/previews/${encodeURIComponent(id)}/rows?${new URLSearchParams({ page: String(page) })}`)
      .then((response) => response.json() as Promise<OrgStructurePreview>);
  },
  async cancel(id: string) {
    await request(`/previews/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async updateRow(id: string, rowNumber: number, values: Record<OrgStructureColumn, string>) {
    await request(`/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });
  },
  async deleteRow(id: string, rowNumber: number) {
    await request(`/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, { method: 'DELETE' });
  },
  commit(id: string) {
    return request(`/previews/${encodeURIComponent(id)}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmReplacement: true }),
    }).then((response) => response.json() as Promise<{ importedRows: number; replacedRows: number }>);
  },
};