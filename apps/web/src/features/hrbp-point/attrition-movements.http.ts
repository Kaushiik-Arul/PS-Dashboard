import type { AttritionMovementQuery, AttritionMovementsClient, AttritionMovementsPage } from './attrition-movements.types';

export const httpAttritionMovementsClient: AttritionMovementsClient = {
  async list(input: AttritionMovementQuery) {
    const query = new URLSearchParams({ view: input.view, page: String(input.page), pageSize: String(input.pageSize) });
    if (input.search) query.set('search', input.search);
    if (input.year !== null) query.set('year', String(input.year));
    if (input.month !== null) query.set('month', String(input.month));
    const response = await fetch(`/api/hrbp-point/attrition-movements?${query}`, { cache: 'no-store' });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? 'The attrition movement request could not be completed.');
    }
    return response.json() as Promise<AttritionMovementsPage>;
  },
  async dismissCandidate(candidateId: string) {
    const response = await fetch(`/api/hrbp-point/attrition-movements/candidates/${encodeURIComponent(candidateId)}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? 'The pending departure could not be dismissed.');
    }
  },
};