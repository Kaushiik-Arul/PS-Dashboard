import { forwardOrgStructure, orgStructureError } from '@/features/hrbp-point/org-structure-import.api';

export async function GET(request: Request, { params }: { params: Promise<{ previewId: string }> }) {
  try {
    const { previewId } = await params;
    const response = await forwardOrgStructure(`/previews/${encodeURIComponent(previewId)}/rows${new URL(request.url).search}`);
    return Response.json(await response.json());
  } catch (error) {
    return orgStructureError(error);
  }
}