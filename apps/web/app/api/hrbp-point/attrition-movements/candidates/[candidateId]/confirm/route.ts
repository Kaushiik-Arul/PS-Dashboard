import { attritionMovementsErrorResponse, forwardAttritionMovementsRequest } from '@/features/hrbp-point/attrition-movements.api';

type Context = { params: Promise<{ candidateId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { candidateId } = await params;
    const csrfToken = request.headers.get('x-csrf-token');
    const response = await forwardAttritionMovementsRequest(`/candidates/${encodeURIComponent(candidateId)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json());
  } catch (error) {
    return attritionMovementsErrorResponse(error);
  }
}