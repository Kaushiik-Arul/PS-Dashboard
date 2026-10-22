import { forwardOrgStructure, orgStructureError } from '@/features/hrbp-point/org-structure-import.api';

export async function POST(request: Request, { params }: { params: Promise<{ previewId: string }> }) {
  try {
    const { previewId } = await params;
    const csrf = request.headers.get('x-csrf-token');
    const response = await forwardOrgStructure(`/previews/${encodeURIComponent(previewId)}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json());
  } catch (error) {
    return orgStructureError(error);
  }
}