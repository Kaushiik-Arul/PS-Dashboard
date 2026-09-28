import { forwardJdManagementRequest, jdManagementErrorResponse } from '@/features/hrbp-point/jd-management.api';
type Context = { params: Promise<{ jobDescriptionId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { jobDescriptionId } = await params; const csrf = request.headers.get('x-csrf-token');
    const response = await forwardJdManagementRequest('job-descriptions', `/${encodeURIComponent(jobDescriptionId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(await request.json()) });
    return Response.json(await response.json());
  } catch (error) { return jdManagementErrorResponse(error, 'Unable to update job description'); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { jobDescriptionId } = await params; const csrf = request.headers.get('x-csrf-token');
    await forwardJdManagementRequest('job-descriptions', `/${encodeURIComponent(jobDescriptionId)}`, { method: 'DELETE', headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
    return new Response(null, { status: 204 });
  } catch (error) { return jdManagementErrorResponse(error, 'Unable to delete job description'); }
}