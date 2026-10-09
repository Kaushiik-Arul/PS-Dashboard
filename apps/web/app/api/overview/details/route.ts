import { getOverviewDetails } from "@/features/overview/overview.api";
import type { OverviewDetailMetric, OverviewQueryFilters } from "@/features/overview/overview.types";

const detailMetrics = new Set<OverviewDetailMetric>([
  "total-hc", "direct-hc", "indirect-hc", "female-pct", "avg-age",
  "avg-tenure", "ret-3yrs", "maternity", "sabbatical", "crl",
]);

const filterKeys = [
  "functionName", "orgUnit", "range", "location", "gender", "directOrIndirect",
] as const;

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const metric = searchParams.get("metric") as OverviewDetailMetric | null;
  if (!metric || !detailMetrics.has(metric)) {
    return Response.json({ message: "Overview KPI metric is invalid" }, { status: 400 });
  }

  try {
    const filters: OverviewQueryFilters = {};
    const reportingMonth = searchParams.get("reportingMonth");
    if (reportingMonth) filters.reportingMonth = reportingMonth;
    filterKeys.forEach((key) => {
      const values = searchParams.getAll(key).filter(Boolean);
      if (values.length) filters[key] = values;
    });
    return Response.json(await getOverviewDetails(metric, filters));
  } catch {
    return Response.json({ message: "Unable to load KPI details" }, { status: 500 });
  }
}