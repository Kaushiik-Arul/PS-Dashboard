import { forwardStep, stepError } from '@/features/hrbp-point/active-step.api';
export async function DELETE(request: Request, { params }: { params: Promise<{ previewId: string }> }) {
  try {
    const { previewId } = await params;
    const csrf = request.headers.get('x-csrf-token');
    await forwardStep(`/previews/${encodeURIComponent(previewId)}`, { method: 'DELETE', headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
    return new Response(null, { status: 204 });
  } catch (error) { return stepError(error); }
}
