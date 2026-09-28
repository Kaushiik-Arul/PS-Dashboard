import { forwardJdManagementRequest, jdManagementErrorResponse } from '@/features/hrbp-point/jd-management.api';

export async function GET(request: Request) {
  try { return Response.json(await (await forwardJdManagementRequest('job-descriptions', new URL(request.url).search)).json()); }
  catch (error) { return jdManagementErrorResponse(error, 'Unable to load job descriptions'); }
}

export async function POST(request: Request) {
  try {
    const csrf = request.headers.get('x-csrf-token');
    const response = await forwardJdManagementRequest('job-descriptions', '', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(await request.json()) });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return jdManagementErrorResponse(error, 'Unable to create job description'); }
}