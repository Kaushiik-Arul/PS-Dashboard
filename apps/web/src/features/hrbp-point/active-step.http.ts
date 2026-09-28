import { getCsrfToken } from '@/auth/csrf';
import type { StepPreview, StepColumn } from './active-step.types';

async function request(path: string, init?: RequestInit) {
  const csrf = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/active-step${path}`, {
    ...init,
    headers: { ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    if (response.status === 404 && /\/previews\/[^/]+\/rows\/\d+$/.test(path) && body?.message?.startsWith('Cannot ')) {
      throw new Error('The Active STEP row API is not running yet. Restart the NestJS API after applying the edit/delete patch.');
    }
    throw new Error(body?.message ?? 'Active STEP request failed.');
  }
  return response;
}

export const activeStepClient = {
  async upload(file: File): Promise<StepPreview> {
    const body = new FormData(); body.set('file', file);
    const { id } = await request('/previews', { method: 'POST', body }).then((response) => response.json() as Promise<{ id: string }>);
    return this.preview(id, 'all', 1);
  },
  preview(id: string, filter: 'all' | 'valid' | 'invalid', page: number): Promise<StepPreview> {
    return request(`/previews/${encodeURIComponent(id)}/rows?${new URLSearchParams({ filter, page: String(page) })}`)
      .then((response) => response.json() as Promise<StepPreview>);
  },
  async cancel(id: string) { await request(`/previews/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  async updateRow(id: string, rowNumber: number, values: Record<StepColumn, string>) {
    await request(`/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }),
    });
  },
  async deleteRow(id: string, rowNumber: number) {
    await request(`/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, { method: 'DELETE' });
  },
  commit(id: string) {
    return request(`/previews/${encodeURIComponent(id)}/commit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmReplacement: true }),
    }).then((response) => response.json() as Promise<{ importedRows: number; replacedRows: number }>);
  },
};
