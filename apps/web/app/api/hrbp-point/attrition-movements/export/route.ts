import {
  attritionMovementsErrorResponse,
  forwardAttritionMovementsRequest,
} from '@/features/hrbp-point/attrition-movements.api';

export async function POST(request: Request) {
  try {
    const csrfToken = request.headers.get('x-csrf-token');
    const response = await forwardAttritionMovementsRequest('/export', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    });
    const headers = new Headers();
    ['content-type', 'content-length', 'content-disposition'].forEach((name) => {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    });
    headers.set('Cache-Control', 'private, no-store');
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    return attritionMovementsErrorResponse(error);
  }
}