import 'server-only';
import { getSessionHeaders } from '@/auth/server-session';

class NominationStatusApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: unknown = [],
  ) {
    super(message);
  }
}

export async function forwardNominationStatus(
  path: string,
  init: RequestInit = {},
) {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === 'production')
    throw new Error('API_BASE_URL is required');
  const base = configured
    ? new URL(configured).toString().replace(/\/$/, '')
    : 'http://127.0.0.1:3001/api/v1';
  const response = await fetch(
    `${base}/hrbp-point/nomination-status${path}`,
    {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(await getSessionHeaders()),
        ...init.headers,
      },
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
      issues?: unknown;
    } | null;
    throw new NominationStatusApiError(
      Array.isArray(body?.message)
        ? body.message.join(' ')
        : body?.message || 'Nomination status request failed.',
      response.status,
      body?.issues,
    );
  }
  return response;
}

export function nominationStatusError(error: unknown) {
  if (error instanceof NominationStatusApiError)
    return Response.json(
      { message: error.message, issues: error.issues },
      { status: error.status },
    );
  return Response.json(
    { message: 'Unable to process nomination status data.' },
    { status: 500 },
  );
}