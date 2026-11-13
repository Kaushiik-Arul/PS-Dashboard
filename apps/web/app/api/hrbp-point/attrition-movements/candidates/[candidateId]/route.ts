import { attritionMovementsErrorResponse, forwardAttritionMovementsRequest } from '@/features/hrbp-point/attrition-movements.api';

export async function DELETE(_request: Request, context: { params: Promise<{ candidateId: string }> }) {
  try {
    const { candidateId } = await context.params;
    await forwardAttritionMovementsRequest(`/candidates/${encodeURIComponent(candidateId)}`, { method: 'DELETE' });
    return new Response(null, { status: 204 });
  } catch (error) {
    return attritionMovementsErrorResponse(error);
  }
}