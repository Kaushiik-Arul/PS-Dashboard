import { connection } from "next/server";
import Link from "next/link";
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
  let overview;
  try {
    overview = await getOverview(filters);
  } catch (error) {
    console.error("Unable to load workforce overview", error);
    return (
      <main className="error-page" role="alert">
        <strong className="error-page__code">500</strong>
        <h1>Workforce data could not be loaded</h1>
        <p>Confirm the API service is running, then reload the dashboard.</p>
        <Link className="a-button a-button--primary" href="/">
          <span className="a-button__label">Reload dashboard</span>
        </Link>
      </main>
    );
  }
  const filterKey = filterKeys.map((key) => filters[key] ?? "").join("|");
  return <OverviewDashboard key={filterKey} data={overview} activeFilters={filters} />;
}
