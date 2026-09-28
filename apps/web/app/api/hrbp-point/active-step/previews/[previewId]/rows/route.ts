import { forwardStep, stepError } from '@/features/hrbp-point/active-step.api';
export async function GET(request: Request, { params }: { params: Promise<{ previewId: string }> }) {
  try {
    const { previewId } = await params;
    return Response.json(await (await forwardStep(`/previews/${encodeURIComponent(previewId)}/rows${new URL(request.url).search}`)).json());
  } catch (error) { return stepError(error); }
}
