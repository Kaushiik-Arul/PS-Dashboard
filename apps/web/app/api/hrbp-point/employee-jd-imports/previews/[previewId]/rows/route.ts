import { forwardJdManagementRequest, jdManagementErrorResponse } from '@/features/hrbp-point/jd-management.api';
type Context = { params: Promise<{ previewId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { previewId } = await params;
    const response = await forwardJdManagementRequest('employee-jd-imports', `/previews/${encodeURIComponent(previewId)}/rows${new URL(request.url).search}`);
    return Response.json(await response.json());
  } catch (error) { return jdManagementErrorResponse(error, 'Unable to load employee JD preview'); }
}