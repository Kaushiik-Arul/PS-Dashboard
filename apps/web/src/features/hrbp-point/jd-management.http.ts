import { getCsrfToken } from '@/auth/csrf';
import type {
  EmployeeJdPreview,
  EmployeeJdPreviewFilter,
  EmployeeJdPreviewRow,
  JobDescription,
  JobDescriptionInput,
  JobDescriptionPage,
} from './jd-management.types';

async function request(resource: string, path: string, init?: RequestInit): Promise<Response> {
  const csrfToken = getCsrfToken();
  const response = await fetch(`/api/hrbp-point/${resource}${path}`, {
    ...init,
    headers: { ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? 'The JD management request could not be completed.');
  }
  return response;
}

export const jobDescriptionsClient = {
  findBySuffix(suffix: string) {
    return request('job-descriptions', `/by-suffix?${new URLSearchParams({ suffix })}`)
      .then((response) => response.json() as Promise<JobDescription[]>);
  },
  list(search: string, page: number, pageSize: number) {
    const query = new URLSearchParams({ search, page: String(page), pageSize: String(pageSize) });
    return request('job-descriptions', `?${query}`).then((response) => response.json() as Promise<JobDescriptionPage>);
  },
  create(input: JobDescriptionInput) {
    return request('job-descriptions', '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      .then((response) => response.json() as Promise<JobDescription>);
  },
  update(id: string, input: JobDescriptionInput) {
    return request('job-descriptions', `/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      .then((response) => response.json() as Promise<JobDescription>);
  },
  async delete(id: string) { await request('job-descriptions', `/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  importCsv(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    return request('job-descriptions', '/import', { method: 'POST', body: formData })
      .then((response) => response.json() as Promise<{ totalRows: number; created: number; updated: number; unchanged: number }>);
  },
};

async function getPreviewRows(id: string, filter: EmployeeJdPreviewFilter, page: number, pageSize: number) {
  const query = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) });
  return request('employee-jd-imports', `/previews/${encodeURIComponent(id)}/rows?${query}`)
    .then((response) => response.json() as Promise<EmployeeJdPreview>);
}

export const employeeJdImportClient = {
  async createPreview(file: File, reportingMonth: string) {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('reportingMonth', `${reportingMonth}-01`);
    const summary = await request('employee-jd-imports', '/previews', { method: 'POST', body: formData })
      .then((response) => response.json() as Promise<{ id: string }>);
    return getPreviewRows(summary.id, 'all', 1, 25);
  },
  getRows: getPreviewRows,
  async updateRow(id: string, row: EmployeeJdPreviewRow, filter: EmployeeJdPreviewFilter, page: number) {
    await request('employee-jd-imports', `/previews/${encodeURIComponent(id)}/rows/${row.rowNumber}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row.values),
    });
    return getPreviewRows(id, filter, page, 25);
  },
  async deleteRow(id: string, rowNumber: number, filter: EmployeeJdPreviewFilter, page: number) {
    await request('employee-jd-imports', `/previews/${encodeURIComponent(id)}/rows/${rowNumber}`, { method: 'DELETE' });
    const preview = await getPreviewRows(id, filter, page, 25);
    const lastPage = Math.max(1, Math.ceil(preview.filteredRows / 25));
    return page > lastPage ? getPreviewRows(id, filter, lastPage, 25) : preview;
  },
  async cancel(id: string) { await request('employee-jd-imports', `/previews/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  commit(id: string, confirmReplacement: boolean) {
    return request('employee-jd-imports', `/previews/${encodeURIComponent(id)}/commit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmReplacement }),
    }).then((response) => response.json() as Promise<{ totalRows: number; movements: number }>);
  },
};
