import { connection } from "next/server";
import Link from "next/link";
import { getArchivedOverview, getOverview, getOverviewArchivedMonths, getOverviewAvailableMonths } from "@/features/overview/overview.api";
import { OverviewDashboard } from "@/features/overview/OverviewDashboardView";
import type { OverviewAvailableMonths, OverviewQueryFilters } from "@/features/overview/overview.types";

type OverviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const filterKeys = [
  "reportingMonth",
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
  const [availableMonths, archivedMonths] = await Promise.all([
    getOverviewAvailableMonths().catch((): OverviewAvailableMonths => ({ currentMonth: null, detailedMonths: [] })),
    getOverviewArchivedMonths().catch((): string[] => []),
  ]);
  const latestHistoricalMonth = [
    ...availableMonths.detailedMonths,
    ...archivedMonths,
  ].toSorted((left, right) => right.localeCompare(left))[0];
  const selectedMonth = filters.reportingMonth
    ?? (!availableMonths.currentMonth ? latestHistoricalMonth : undefined);
  const isArchived = Boolean(selectedMonth && archivedMonths.includes(selectedMonth));
  const effectiveFilters: OverviewQueryFilters = selectedMonth
    ? isArchived
      ? { reportingMonth: selectedMonth }
      : { ...filters, reportingMonth: selectedMonth }
    : filters;
  let overview;
  try {
    overview = isArchived && selectedMonth
      ? await getArchivedOverview(selectedMonth)
      : await getOverview(effectiveFilters);
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
  const filterKey = filterKeys.map((key) => effectiveFilters[key] ?? "").join("|");
  return <OverviewDashboard key={filterKey} data={overview} activeFilters={effectiveFilters} availableMonths={availableMonths} archivedMonths={archivedMonths} isArchived={isArchived} />;
}
