import { getCsrfToken } from '@/auth/csrf';

export async function updateEmployeeJobDescription(persNo: string, jdId: string, effectiveDate: string) {
  const csrf = getCsrfToken();
  const response = await fetch(`/api/employee-360/${encodeURIComponent(persNo)}/job-description`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: JSON.stringify({ jdId, effectiveDate }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? 'The job description could not be updated.');
  }
  return response.json() as Promise<{ jdId: string; jdName: string; effectiveDate: string; changed: boolean }>;
}