import { forwardJdManagementRequest, jdManagementErrorResponse } from '@/features/hrbp-point/jd-management.api';

export async function POST(request: Request) {
  try {
    const csrf = request.headers.get('x-csrf-token');
    const response = await forwardJdManagementRequest('employee-jd-imports', '/previews', { method: 'POST', headers: csrf ? { 'X-CSRF-Token': csrf } : {}, body: await request.formData() });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return jdManagementErrorResponse(error, 'Unable to create employee JD preview'); }
}