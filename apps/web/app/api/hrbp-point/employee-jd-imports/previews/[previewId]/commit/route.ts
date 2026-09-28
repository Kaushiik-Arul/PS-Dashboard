import { forwardJdManagementRequest, jdManagementErrorResponse } from '@/features/hrbp-point/jd-management.api';
type Context = { params: Promise<{ previewId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { previewId } = await params; const csrf = request.headers.get('x-csrf-token');
    const response = await forwardJdManagementRequest('employee-jd-imports', `/previews/${encodeURIComponent(previewId)}/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(await request.json()) });
    return Response.json(await response.json());
  } catch (error) { return jdManagementErrorResponse(error, 'Unable to commit employee JD assignments'); }
}