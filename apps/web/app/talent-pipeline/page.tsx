import { connection } from "next/server";
import Link from "next/link";
import { TalentPipelineDashboard } from "@/features/talent-pipeline/TalentPipelineDashboard";
import { getTalentPipeline, getTalentPipelineHistoryState, getTalentPipelineSnapshot } from "@/features/talent-pipeline/talent-pipeline.api";
import type { TalentPipelineHistoryState, TalentPipelineQueryFilters } from "@/features/talent-pipeline/talent-pipeline.types";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const filterKeys = [
  "reportingMonth", "functionName", "orgUnit", "range", "location", "gender", "directOrIndirect",
] as const;

export default async function TalentPipelinePage({ searchParams }: Props) {
  await connection();
  const query = await searchParams;
  const filters: TalentPipelineQueryFilters = {};
  filterKeys.forEach((key) => {
    const value = query[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) filters[key] = first;
  });
  const historyState = await getTalentPipelineHistoryState().catch((): TalentPipelineHistoryState | null => null);
  const requestedMonth = filters.reportingMonth;
  const selectedMonth = requestedMonth && historyState?.snapshotMonths.includes(requestedMonth)
    ? requestedMonth
    : undefined;
  const isSnapshot = Boolean(selectedMonth && historyState?.snapshotMonths.includes(selectedMonth));
  const liveFilters = { ...filters };
  delete liveFilters.reportingMonth;
  const effectiveFilters: TalentPipelineQueryFilters = isSnapshot && selectedMonth
    ? { reportingMonth: selectedMonth }
    : liveFilters;
  try {
    const data = isSnapshot && selectedMonth
      ? await getTalentPipelineSnapshot(selectedMonth)
      : await getTalentPipeline(effectiveFilters);
    const filterKey = filterKeys.map((key) => effectiveFilters[key] ?? "").join("|");
    return <TalentPipelineDashboard key={filterKey} data={data} activeFilters={effectiveFilters} historyState={historyState} isSnapshot={isSnapshot} />;
  } catch (error) {
    console.error("Unable to load Talent Pipeline", error);
    return <main className="error-page" role="alert">
      <strong className="error-page__code">500</strong>
      <h1>Talent Pipeline data could not be loaded</h1>
      <p>Confirm the API service is running, then reload this dashboard.</p>
      <Link className="a-button a-button--primary" href="/talent-pipeline">
        <span className="a-button__label">Reload dashboard</span>
      </Link>
    </main>;
  }
}