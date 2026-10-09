import { getOverview } from "@/features/overview/overview.api";
import type { OverviewQueryFilters } from "@/features/overview/overview.types";

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
    const filters: OverviewQueryFilters = {};
    const reportingMonth = searchParams.get("reportingMonth");
    if (reportingMonth) filters.reportingMonth = reportingMonth;
    filterKeys.forEach((key) => {
      const values = searchParams.getAll(key).filter(Boolean);
      if (values.length) filters[key] = values;
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