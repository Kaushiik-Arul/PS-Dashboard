import { getMrmMonths, MrmApiError } from "@/features/mrm/mrm.api";

export async function GET() {
  try { return Response.json(await getMrmMonths()); }
  catch (error) {
    const status = error instanceof MrmApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Unable to load MRM months." }, { status });
  }
}