import { forwardStep, stepError } from '@/features/hrbp-point/active-step.api';

type Context = { params: Promise<{ previewId: string; rowNumber: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { previewId, rowNumber } = await params;
    const csrf = request.headers.get('x-csrf-token');
    const body = await request.json();
    await forwardStep(`/previews/${encodeURIComponent(previewId)}/rows/${encodeURIComponent(rowNumber)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(body),
    });
    return new Response(null, { status: 204 });
  } catch (error) { return stepError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { previewId, rowNumber } = await params;
    const csrf = request.headers.get('x-csrf-token');
    await forwardStep(`/previews/${encodeURIComponent(previewId)}/rows/${encodeURIComponent(rowNumber)}`, { method: 'DELETE', headers: csrf ? { 'X-CSRF-Token': csrf } : {} });
    return new Response(null, { status: 204 });
  } catch (error) { return stepError(error); }
}
