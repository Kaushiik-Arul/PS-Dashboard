import { forwardJdManagementRequest, jdManagementErrorResponse } from '@/features/hrbp-point/jd-management.api';
type Context = { params: Promise<{ previewId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { previewId } = await params; const csrf = request.headers.get('x-csrf-token');
    await forwardJdManagementRequest('employee-jd-imports', `/previews/${encodeURIComponent(previewId)}`, { method: 'DELETE', headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
    return new Response(null, { status: 204 });
  } catch (error) { return jdManagementErrorResponse(error, 'Unable to cancel employee JD preview'); }
}