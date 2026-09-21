import { connection } from "next/server";
import { getOverview } from "@/features/overview/overview.api";
import { OverviewDashboard } from "@/features/overview/OverviewDashboardView";
import type { OverviewQueryFilters } from "@/features/overview/overview.types";

type OverviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const filterKeys = [
  "functionName",
  "orgUnit",
  "range",
  "location",
  "gender",
  "directOrIndirect",
] as const;

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  await connection();
  const query = await searchParams;
  const filters: OverviewQueryFilters = {};
  filterKeys.forEach((key) => {
    const value = query[key];
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue) filters[key] = firstValue;
  });
  const overview = await getOverview(filters);
  const filterKey = filterKeys.map((key) => filters[key] ?? "").join("|");
  return <OverviewDashboard key={filterKey} data={overview} activeFilters={filters} />;
}