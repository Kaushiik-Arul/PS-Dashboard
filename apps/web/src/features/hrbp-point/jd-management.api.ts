import 'server-only';
import { getSessionHeaders } from '@/auth/server-session';

export class JdManagementApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function apiBaseUrl() {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === 'production') throw new Error('API_BASE_URL is required in production');
    return 'http://127.0.0.1:3001/api/v1';
  }
  return new URL(configured).toString().replace(/\/$/, '');
}

export async function forwardJdManagementRequest(resource: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl()}/hrbp-point/${resource}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/json', ...(await getSessionHeaders()), ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    let message = 'JD management request failed';
    try {
      const body = await response.json() as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      if (Array.isArray(body.message)) message = body.message.join(' ');
    } catch { /* Keep the generic upstream message. */ }
    throw new JdManagementApiError(message, response.status);
  }
  return response;
}

export function jdManagementErrorResponse(error: unknown, fallback: string) {
  if (error instanceof JdManagementApiError) return Response.json({ message: error.message }, { status: error.status });
  return Response.json({ message: fallback }, { status: 500 });
}