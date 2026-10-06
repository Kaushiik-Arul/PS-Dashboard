import { connection } from "next/server";
import Link from "next/link";
import { SuccessionPlanningDashboard } from "@/features/succession-planning/SuccessionPlanningDashboard";
import {
  getSuccessionPlanningHistoryState,
  getSuccessionPlanningRegister,
  getSuccessionPlanningSnapshot,
} from "@/features/succession-planning/succession-planning.api";
import type {
  SuccessionPlanningHistoryState,
  SuccessionPlanningQueryFilters,
} from "@/features/succession-planning/succession-planning.types";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const filterKeys = [
  "reportingMonth", "functionName", "orgUnit", "range", "location", "gender", "directOrIndirect",
] as const;

export default async function SuccessionPlanningPage({ searchParams }: Props) {
  await connection();
  const query = await searchParams;
  const filters: SuccessionPlanningQueryFilters = {};
  filterKeys.forEach((key) => {
    const value = query[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) filters[key] = first;
  });
  const historyState = await getSuccessionPlanningHistoryState().catch((): SuccessionPlanningHistoryState | null => null);
  const selectedMonth = filters.reportingMonth && historyState?.snapshotMonths.includes(filters.reportingMonth)
    ? filters.reportingMonth
    : undefined;
  const isSnapshot = Boolean(selectedMonth);
  const liveFilters = { ...filters };
  delete liveFilters.reportingMonth;
  const effectiveFilters: SuccessionPlanningQueryFilters = selectedMonth
    ? { reportingMonth: selectedMonth }
    : liveFilters;
  try {
    const data = selectedMonth
      ? await getSuccessionPlanningSnapshot(selectedMonth)
      : await getSuccessionPlanningRegister(effectiveFilters);
    const filterKey = filterKeys.map((key) => effectiveFilters[key] ?? "").join("|");
    return <SuccessionPlanningDashboard key={filterKey} data={data} activeFilters={effectiveFilters} historyState={historyState} isSnapshot={isSnapshot} />;
  } catch (error) {
    console.error("Unable to load Succession Planning", error);
    return <main className="error-page" role="alert">
      <strong className="error-page__code">500</strong>
      <h1>Succession Planning data could not be loaded</h1>
      <p>Confirm the API service and database migration are available, then reload this page.</p>
      <Link className="a-button a-button--primary" href="/succession-planning">
        <span className="a-button__label">Reload register</span>
      </Link>
    </main>;
  }
}