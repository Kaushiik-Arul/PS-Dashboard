import 'server-only';
import { getSessionHeaders } from '@/auth/server-session';

class OrgStructureApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function forwardOrgStructure(path: string, init: RequestInit = {}) {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('API_BASE_URL is required');
  const base = configured ? new URL(configured).toString().replace(/\/$/, '') : 'http://127.0.0.1:3001/api/v1';
  const response = await fetch(`${base}/hrbp-point/org-structure${path}`, {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/json', ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    throw new OrgStructureApiError(
      Array.isArray(body?.message) ? body.message.join(' ') : body?.message || 'Org structure request failed.',
      response.status,
    );
  }
  return response;
}

export function orgStructureError(error: unknown) {
  if (error instanceof OrgStructureApiError) return Response.json({ message: error.message }, { status: error.status });
  return Response.json({ message: 'Unable to load org structure.' }, { status: 500 });
}