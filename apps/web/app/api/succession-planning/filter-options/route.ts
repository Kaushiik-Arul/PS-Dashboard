import { getSuccessionPlanningRegister } from "@/features/succession-planning/succession-planning.api";
import type { SuccessionPlanningQueryFilters } from "@/features/succession-planning/succession-planning.types";

const filterKeys = [
  "functionName",
  "orgUnit",
  "range",
  "location",
  "gender",
  "directOrIndirect",
] as const;

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const filters: SuccessionPlanningQueryFilters = {};
    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    });
    return Response.json((await getSuccessionPlanningRegister(filters)).filterOptions);
  } catch {
    return Response.json(
      { message: "Unable to load Succession Planning filter options" },
      { status: 500 },
    );
  }
}
