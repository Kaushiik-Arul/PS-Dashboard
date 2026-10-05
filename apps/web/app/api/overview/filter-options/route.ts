import { getOverview } from "@/features/overview/overview.api";
import type { OverviewQueryFilters } from "@/features/overview/overview.types";

const filterKeys = [
  "reportingMonth",
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
    const filters: OverviewQueryFilters = {};
    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) filters[key] = value;
    });
    const overview = await getOverview(filters);
    return Response.json(overview.filterOptions);
  } catch {
    return Response.json(
      { message: "Unable to load filter options" },
      { status: 500 },
    );
  }
}