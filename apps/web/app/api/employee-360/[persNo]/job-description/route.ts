import { employee360ErrorResponse, forwardCareerJourneyRequest } from '@/features/employee-360/employee-360.api';
type Context = { params: Promise<{ persNo: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { persNo } = await params; const csrf = request.headers.get('x-csrf-token');
    const response = await forwardCareerJourneyRequest(`/${encodeURIComponent(persNo)}/job-description`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: JSON.stringify(await request.json()) });
    return Response.json(await response.json());
  } catch (error) { return employee360ErrorResponse(error, 'Unable to update job description'); }
}