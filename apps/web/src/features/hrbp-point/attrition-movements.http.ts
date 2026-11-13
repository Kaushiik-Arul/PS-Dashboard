import { getCsrfToken } from '@/auth/csrf';
import type { AttritionMovementQuery, AttritionMovementsClient, AttritionMovementsPage } from './attrition-movements.types';

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? fallback;
}

async function downloadResponse(response: Response): Promise<{ fileName: string }> {
  const disposition = response.headers.get('content-disposition') ?? '';
  const fileName = disposition.match(/filename="([^"]+)"/i)?.[1]
    ?? 'PS_Confirmed_Attrition_All_History.xlsx';
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return { fileName };
}

export const httpAttritionMovementsClient: AttritionMovementsClient = {
  async list(input: AttritionMovementQuery) {
    const query = new URLSearchParams({ view: input.view, page: String(input.page), pageSize: String(input.pageSize) });
    if (input.search) query.set('search', input.search);
    if (input.year !== null) query.set('year', String(input.year));
    if (input.month !== null) query.set('month', String(input.month));
    const response = await fetch(`/api/hrbp-point/attrition-movements?${query}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(await errorMessage(response, 'The attrition movement request could not be completed.'));
    }
    return response.json() as Promise<AttritionMovementsPage>;
  },
  async dismissCandidate(candidateId: string) {
    const response = await fetch(`/api/hrbp-point/attrition-movements/candidates/${encodeURIComponent(candidateId)}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(await errorMessage(response, 'The pending departure could not be dismissed.'));
    }
  },
  async exportConfirmedHistory() {
    const csrfToken = getCsrfToken();
    const response = await fetch('/api/hrbp-point/attrition-movements/export', {
      method: 'POST',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response, 'Confirmed attrition history could not be exported.'));
    }
    return downloadResponse(response);
  },
};