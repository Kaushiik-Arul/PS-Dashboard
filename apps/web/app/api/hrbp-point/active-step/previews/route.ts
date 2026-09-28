import { forwardStep, stepError } from '@/features/hrbp-point/active-step.api';
export async function POST(request: Request) {
  try {
    const csrf = request.headers.get('x-csrf-token');
    const response = await forwardStep('/previews', { method: 'POST', headers: csrf ? { 'X-CSRF-Token': csrf } : {}, body: await request.formData() });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return stepError(error); }
}
