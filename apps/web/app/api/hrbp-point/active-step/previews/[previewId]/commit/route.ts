import { forwardStep, stepError } from '@/features/hrbp-point/active-step.api';
export async function POST(request: Request, { params }: { params: Promise<{ previewId: string }> }) {
  try {
    const { previewId } = await params;
    const csrf = request.headers.get('x-csrf-token');
    return Response.json(await (await forwardStep(`/previews/${encodeURIComponent(previewId)}/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(await request.json()) })).json());
  } catch (error) { return stepError(error); }
}
