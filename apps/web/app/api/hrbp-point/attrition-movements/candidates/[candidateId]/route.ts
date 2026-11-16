import { attritionMovementsErrorResponse, forwardAttritionMovementsRequest } from '@/features/hrbp-point/attrition-movements.api';

type Context = { params: Promise<{ candidateId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { candidateId } = await params;
    const response = await forwardAttritionMovementsRequest(`/candidates/${encodeURIComponent(candidateId)}`);
    return Response.json(await response.json());
  } catch (error) {
    return attritionMovementsErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { candidateId } = await params;
    const csrfToken = request.headers.get('x-csrf-token');
    await forwardAttritionMovementsRequest(`/candidates/${encodeURIComponent(candidateId)}`, {
      method: 'DELETE',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return attritionMovementsErrorResponse(error);
  }
}