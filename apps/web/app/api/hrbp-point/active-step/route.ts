import { forwardStep, stepError } from '@/features/hrbp-point/active-step.api';
export async function GET() {
  try { return Response.json(await (await forwardStep('')).json()); }
  catch (error) { return stepError(error); }
}
