import { forwardOrgStructure, orgStructureError } from '@/features/hrbp-point/org-structure-import.api';

export async function GET() {
  try {
    return Response.json(await (await forwardOrgStructure('')).json());
  } catch (error) {
    return orgStructureError(error);
  }
}