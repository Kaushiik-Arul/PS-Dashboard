import { forwardOrgStructure, orgStructureError } from '@/features/hrbp-point/org-structure-import.api';

export async function POST(request: Request) {
  try {
    const csrf = request.headers.get('x-csrf-token');
    const response = await forwardOrgStructure('/previews', {
      method: 'POST',
      headers: csrf ? { 'X-CSRF-Token': csrf } : {},
      body: await request.formData(),
    });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) {
    return orgStructureError(error);
  }
}