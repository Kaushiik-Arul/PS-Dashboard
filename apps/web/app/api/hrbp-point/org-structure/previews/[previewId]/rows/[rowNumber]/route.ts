import { forwardOrgStructure, orgStructureError } from '@/features/hrbp-point/org-structure-import.api';

type Context = { params: Promise<{ previewId: string; rowNumber: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { previewId, rowNumber } = await params;
    const csrf = request.headers.get('x-csrf-token');
    await forwardOrgStructure(`/previews/${encodeURIComponent(previewId)}/rows/${encodeURIComponent(rowNumber)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return orgStructureError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { previewId, rowNumber } = await params;
    const csrf = request.headers.get('x-csrf-token');
    await forwardOrgStructure(`/previews/${encodeURIComponent(previewId)}/rows/${encodeURIComponent(rowNumber)}`, {
      method: 'DELETE',
      headers: csrf ? { 'X-CSRF-Token': csrf } : {},
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return orgStructureError(error);
  }
}