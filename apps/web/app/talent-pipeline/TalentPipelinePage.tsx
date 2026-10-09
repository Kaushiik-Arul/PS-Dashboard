import { connection } from "next/server";
import Link from "next/link";
import { TalentPipelineDashboard } from "@/features/talent-pipeline/TalentPipelineDashboard";
import {
  getTalentPipeline,
  getTalentPipelineHistoryState,
  getTalentPipelineSnapshot,
} from "@/features/talent-pipeline/talent-pipeline.api";
import type {
  TalentPipelineHistoryState,
  TalentPipelineQueryFilters,
  TalentPipelineView,
} from "@/features/talent-pipeline/talent-pipeline.types";

export type TalentPipelinePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const filterKeys = [
  "functionName", "orgUnit", "range", "location", "gender", "directOrIndirect",
] as const;

export async function renderTalentPipelinePage(
  view: TalentPipelineView,
  searchParams: TalentPipelinePageProps["searchParams"],
) {
  await connection();
  const query = await searchParams;
  const filters: TalentPipelineQueryFilters = {};
  const reportingMonth = query.reportingMonth;
  const firstReportingMonth = Array.isArray(reportingMonth) ? reportingMonth[0] : reportingMonth;
  if (firstReportingMonth) filters.reportingMonth = firstReportingMonth;
  filterKeys.forEach((key) => {
    const value = query[key];
    const values = (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
    if (values.length) filters[key] = values;
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
  const routePath = `/talent-pipeline/${view}`;

  try {
    const data = isSnapshot && selectedMonth
      ? await getTalentPipelineSnapshot(selectedMonth)
      : await getTalentPipeline(effectiveFilters);
    const filterKey = [effectiveFilters.reportingMonth ?? "", ...filterKeys.map((key) => effectiveFilters[key]?.join(",") ?? "")].join("|");
    return (
      <TalentPipelineDashboard
        key={`${view}|${filterKey}`}
        view={view}
        data={data}
        activeFilters={effectiveFilters}
        historyState={historyState}
        isSnapshot={isSnapshot}
      />
    );
  } catch (error) {
    console.error("Unable to load Talent Landscape", error);
    return <main className="error-page" role="alert">
      <strong className="error-page__code">500</strong>
      <h1>Talent Landscape data could not be loaded</h1>
      <p>Confirm the API service is running, then reload this dashboard.</p>
      <Link className="a-button a-button--primary" href={routePath}>
        <span className="a-button__label">Reload dashboard</span>
      </Link>
    </main>;
  }
}
