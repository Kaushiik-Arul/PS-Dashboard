import { getCsrfToken } from '@/auth/csrf';
import type {
  NominationStatusColumn,
  NominationStatusIssue,
  NominationStatusPreview,
} from './nomination-status.types';

class NominationStatusRequestError extends Error {
  constructor(
    message: string,
    readonly issues: NominationStatusIssue[] = [],
  ) {
    super(message);
  }
}

async function request(path: string, init?: RequestInit) {
  const csrf = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/nomination-status${path}`, {
    ...init,
    headers: {
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      issues?: NominationStatusIssue[];
    } | null;
    throw new NominationStatusRequestError(
      body?.message ?? 'Nomination status request failed.',
      body?.issues,
    );
  }
  return response;
}

export const nominationStatusClient = {
  async upload(file: File): Promise<NominationStatusPreview> {
    const body = new FormData();
    body.set('file', file);
    const { id } = await request('/previews', {
      method: 'POST',
      body,
    }).then((response) => response.json() as Promise<{ id: string }>);
    return this.preview(id, 'all', 1);
  },
  preview(
    id: string,
    filter: 'all' | 'valid' | 'invalid',
    page: number,
  ): Promise<NominationStatusPreview> {
    const query = new URLSearchParams({ filter, page: String(page) });
    return request(`/previews/${encodeURIComponent(id)}/rows?${query}`).then(
      (response) => response.json() as Promise<NominationStatusPreview>,
    );
  },
  async updateRow(
    id: string,
    rowNumber: number,
    values: Record<NominationStatusColumn, string>,
  ) {
    await request(
      `/previews/${encodeURIComponent(id)}/rows/${rowNumber}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      },
    );
  },
  async deleteRow(id: string, rowNumber: number) {
    await request(
      `/previews/${encodeURIComponent(id)}/rows/${rowNumber}`,
      { method: 'DELETE' },
    );
  },
  async cancel(id: string) {
    await request(`/previews/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
  commit(id: string) {
    return request(`/previews/${encodeURIComponent(id)}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmReplacement: true }),
    }).then(
      (response) =>
        response.json() as Promise<{
          importedRows: number;
          replacedRows: number;
        }>,
    );
  },
};