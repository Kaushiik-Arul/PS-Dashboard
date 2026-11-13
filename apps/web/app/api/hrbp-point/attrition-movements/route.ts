import { attritionMovementsErrorResponse, forwardAttritionMovementsRequest } from '@/features/hrbp-point/attrition-movements.api';

export async function GET(request: Request) {
  try {
    const response = await forwardAttritionMovementsRequest(new URL(request.url).search);
    return Response.json(await response.json());
  } catch (error) {
    return attritionMovementsErrorResponse(error);
  }
}