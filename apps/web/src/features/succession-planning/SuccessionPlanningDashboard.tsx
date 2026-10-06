"use client";

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import { getCsrfToken } from "@/auth/csrf";
import {
  ChartCard,
  DonutChart,
  VerticalBarChart,
  type ChartDatum,
} from "@/components/charts/OverviewCharts";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { KpiCard, type KpiMetric } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import {
  emptyDashboardFilters,
  OverviewFilters,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";
import {
  successionPlanningColumns,
  type SuccessionPlanningFilterOptions,
  type SuccessionPlanningHistoryState,
  type SuccessionPlanningQueryFilters,
  type SuccessionPlanningRecord,
  type SuccessionPlanningResponse,
} from "./succession-planning.types";
import "./succession-planning.css";

const successionFilterFields: readonly DashboardFilterKey[] = [
  "functionName", "orgUnit", "range", "location", "gender", "employmentType",
];

const currentDate = new Date();
const latestSnapshotMonth = new Date(
  Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1),
).toISOString().slice(0, 7);

function toDashboardFilters(filters: SuccessionPlanningQueryFilters): DashboardFilters {
  return {
    ...emptyDashboardFilters,
    functionName: filters.functionName ?? "All",
    orgUnit: filters.orgUnit ?? "All",
    range: filters.range ?? "All",
    location: filters.location ?? "All",
    gender: filters.gender ?? "All",
    employmentType: filters.directOrIndirect ?? "All",
  };
}

function toSearchParams(filters: DashboardFilters) {
  const params = new URLSearchParams();
  const values = [
    ["functionName", filters.functionName],
    ["orgUnit", filters.orgUnit],
    ["range", filters.range],
    ["location", filters.location],
    ["gender", filters.gender],
    ["directOrIndirect", filters.employmentType],
  ] as const;
  values.forEach(([key, value]) => {
    if (value !== "All") params.set(key, value);
  });
  return params;
}

const nonFilterableColumns = new Set([
  "jd_name",
  "reason_for_change",
]);

const columns: DataTableColumn<SuccessionPlanningRecord>[] = successionPlanningColumns.map(
  ([key, label, group]) => ({
    key,
    label,
    group,
    filterable: !nonFilterableColumns.has(key),
  }),
);

const readinessOrder = [
  "Ready now",
  "Ready in 1-2 years",
  "Ready in 2-3 years",
  "Ready in 3-4 years",
  "Ready later / TBD",
] as const;

type Readiness = (typeof readinessOrder)[number];

function readinessCategory(value: string): Readiness | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("now")) return "Ready now";
  if (/1\s*-\s*2/.test(normalized)) return "Ready in 1-2 years";
  if (/2\s*-\s*3/.test(normalized)) return "Ready in 2-3 years";
  if (/3\s*-\s*4/.test(normalized)) return "Ready in 3-4 years";
  return "Ready later / TBD";
}

function employeeCount(value: string) {
  return value.match(/\d+/g)?.length ?? 0;
}

function percentage(value: number, total: number) {
  return total ? `${((value / total) * 100).toFixed(1)}% of positions` : "No positions";
}

function chartValue(label: string, value: number, total: number): ChartDatum {
  return {
    label,
    value,
    displayValue: `${value.toLocaleString("en-US")} (${total ? ((value / total) * 100).toFixed(1) : "0.0"}%)`,
  };
}

function summarize(rows: SuccessionPlanningRecord[]) {
  const successor1Readiness = new Map<Readiness, number>(readinessOrder.map((label) => [label, 0]));
  const successor2Readiness = new Map<Readiness, number>(readinessOrder.map((label) => [label, 0]));
  const criticalities = new Map<string, number>();

  for (const row of rows) {
    const criticality = row.priority.trim() || "Not specified";
    criticalities.set(criticality, (criticalities.get(criticality) ?? 0) + 1);

    const successors = [
      [row.successor1_pers_no, row.successor1_readiness, successor1Readiness],
      [row.successor2_pers_no, row.successor2_readiness, successor2Readiness],
    ] as const;
    for (const [employeeNumbers, readinessValue, readiness] of successors) {
      const count = employeeCount(employeeNumbers);
      const category = readinessCategory(readinessValue);
      if (!count || !category) continue;
      readiness.set(category, (readiness.get(category) ?? 0) + count);
    }
  }

  const totalPositions = rows.length;
  const years = new Map<string, number>();
  for (const row of rows) {
    const value = row.incumbent_change_year.trim();
    if (!value) continue;
    years.set(value, (years.get(value) ?? 0) + 1);
  }

  return {
    totalPositions,
    successor1Readiness,
    successor2Readiness,
    criticalityChart: [...criticalities.entries()]
      .filter(([, value]) => value > 0)
      .map(([label, value], index) => ({
        ...chartValue(label, value, totalPositions),
        color: `var(--data-visualization-${(index % 6) + 1})`,
      })),
    yearChart: [...years.entries()]
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([label, value]) => ({ label, value })),
  };
}

function importDescription(data: SuccessionPlanningResponse) {
  if (!data.importedAt) return "Current position, incumbent, and successor register";
  const imported = new Date(data.importedAt);
  const date = Number.isNaN(imported.getTime())
    ? data.importedAt
    : new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(imported);
  return `${data.rows.length} positions · Imported ${date}${data.fileName ? ` from ${data.fileName}` : ""}`;
}

export function SuccessionPlanningDashboard({
  data,
  activeFilters,
  historyState,
  isSnapshot,
}: {
  data: SuccessionPlanningResponse;
  activeFilters: SuccessionPlanningQueryFilters;
  historyState: SuccessionPlanningHistoryState | null;
  isSnapshot: boolean;
}) {
  const router = useRouter();
  const appliedFilters = toDashboardFilters(activeFilters);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filterOptions, setFilterOptions] = useState(data.filterOptions);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const optionRequestId = useRef(0);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotMonth, setSnapshotMonth] = useState(latestSnapshotMonth);
  const [isSnapshotPublisherOpen, setIsSnapshotPublisherOpen] = useState(false);

  const applyFilters = (filters: DashboardFilters) => {
    const params = toSearchParams(filters);
    setIsFiltering(true);
    startTransition(() => {
      router.push(params.size ? `/succession-planning?${params}` : "/succession-planning");
    });
  };

  const refreshFilterOptions = async (filters: DashboardFilters) => {
    if (isSnapshot) return;
    const requestId = ++optionRequestId.current;
    setIsLoadingOptions(true);
    try {
      const params = toSearchParams(filters);
      const response = await fetch(`/api/succession-planning/filter-options${params.size ? `?${params}` : ""}`);
      if (!response.ok) return;
      const options = (await response.json()) as SuccessionPlanningFilterOptions;
      if (requestId === optionRequestId.current) setFilterOptions(options);
    } catch {
      // Keep the current choices; Apply still validates filters on the server.
    } finally {
      if (requestId === optionRequestId.current) setIsLoadingOptions(false);
    }
  };

  const saveSnapshot = async () => {
    setIsSavingSnapshot(true);
    setSnapshotMessage("");
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/succession-planning/snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ reportingMonth: snapshotMonth }),
      });
      const body = await response.json().catch(() => null) as { message?: string; reportingMonth?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "The monthly snapshot could not be saved.");
      setSnapshotMessage(`Saved Succession Planning snapshot for ${body?.reportingMonth ?? snapshotMonth}.`);
      router.refresh();
    } catch (error) {
      setSnapshotMessage(error instanceof Error ? error.message : "The monthly snapshot could not be saved.");
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const summary = summarize(data.rows);
  const readinessKpis = (
    successor: "successor-1" | "successor-2",
    readiness: Map<Readiness, number>,
  ): KpiMetric[] => [
    { id: `${successor}-ready-now`, title: "Ready now", value: (readiness.get("Ready now") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(readiness.get("Ready now") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-checkmark", iconColor: "green" },
    { id: `${successor}-ready-one-two`, title: "Ready in 1-2 years", value: (readiness.get("Ready in 1-2 years") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(readiness.get("Ready in 1-2 years") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-people", iconColor: "orange" },
    { id: `${successor}-ready-three-four`, title: "Ready in 3-4 years", value: (readiness.get("Ready in 3-4 years") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(readiness.get("Ready in 3-4 years") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-people", iconColor: "purple" },
    { id: `${successor}-ready-later`, title: "Ready later", value: (readiness.get("Ready later / TBD") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(readiness.get("Ready later / TBD") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-calendar", iconColor: "blue" },
  ];
  const successor1Kpis = readinessKpis("successor-1", summary.successor1Readiness);
  const successor2Kpis = readinessKpis("successor-2", summary.successor2Readiness);
  const periodOptions = historyState ? [
    { value: "", label: "Current" },
    ...historyState.snapshotMonths.map((month) => {
      const [year, monthNumber] = month.split("-");
      return { value: month, label: `${monthNumber}/${year}` };
    }),
  ] : undefined;

  return (
    <main className="overview-page">
      <OverviewFilters
        value={draftFilters}
        activeValue={appliedFilters}
        period={historyState ? activeFilters.reportingMonth ?? "" : undefined}
        periodOptions={periodOptions}
        fields={successionFilterFields}
        filtersDisabled={isSnapshot}
        options={{ functionName: filterOptions.functionName, orgUnit: filterOptions.orgUnit, range: filterOptions.range, location: filterOptions.location, gender: filterOptions.gender, employmentType: filterOptions.directOrIndirect }}
        onChange={(filters) => { setDraftFilters(filters); void refreshFilterOptions(filters); }}
        onPeriodChange={historyState ? (reportingMonth) => {
          const params = new URLSearchParams();
          if (reportingMonth) params.set("reportingMonth", reportingMonth);
          startTransition(() => router.push(params.size ? `/succession-planning?${params}` : "/succession-planning"));
        } : undefined}
        onApply={() => applyFilters(draftFilters)}
        onClear={() => { setDraftFilters(emptyDashboardFilters); applyFilters(emptyDashboardFilters); }}
        headerActions={historyState && !isSnapshot ? (
          <div className="succession-history-menu">
            <button className="a-button a-button--secondary -small succession-history-menu__trigger" type="button" aria-label="Save monthly snapshot" aria-expanded={isSnapshotPublisherOpen} aria-controls="succession-snapshot-publisher" title="Save monthly snapshot" onClick={() => setIsSnapshotPublisherOpen((isOpen) => !isOpen)}>
              <i className="a-icon a-button__icon boschicon-bosch-ic-save" aria-hidden="true" />
              <span className="a-button__label">Save monthly snapshot</span>
            </button>
            {isSnapshotPublisherOpen && (
              <div className="succession-history-popover" id="succession-snapshot-publisher" role="dialog" aria-label="Monthly snapshot">
                <strong>Save monthly snapshot</strong>
                <p>Archive the organization-wide Succession Planning results for a reporting month.</p>
                <label className="succession-history-month" htmlFor="succession-snapshot-month">
                  <span>Reporting month</span>
                  <input id="succession-snapshot-month" type="month" max={latestSnapshotMonth} value={snapshotMonth} disabled={isSavingSnapshot} onChange={(event) => setSnapshotMonth(event.target.value)} />
                </label>
                <button className="a-button a-button--secondary -small" type="button" disabled={!snapshotMonth || isSavingSnapshot} onClick={() => void saveSnapshot()}>
                  <i className="a-icon a-button__icon boschicon-bosch-ic-save" aria-hidden="true" />
                  <span className="a-button__label">{isSavingSnapshot ? "Saving..." : "Save snapshot"}</span>
                </button>
                {snapshotMessage && <p className="succession-history-popover__message" role="status">{snapshotMessage}</p>}
              </div>
            )}
          </div>
        ) : undefined}
      />

      {isLoadingOptions && <p className="overview-page__filtering" role="status">Updating filter choices...</p>}
      {isFiltering && <p className="overview-page__filtering" role="status">Updating dashboard...</p>}

      <section className="kpi-section succession-readiness" aria-labelledby="succession-summary-title">
        <div className="kpi-section__header">
          <div>
            <h2 className="kpi-section__title" id="succession-summary-title">Successor readiness</h2>
            <p className="kpi-section__description">Primary and secondary successor coverage across the current register</p>
          </div>
          <div className="succession-readiness__total" aria-label={`${summary.totalPositions} total positions`}>
            <i className="a-icon boschicon-bosch-ic-briefcase" aria-hidden="true" />
            <span>Total positions</span>
            <strong>{summary.totalPositions.toLocaleString("en-US")}</strong>
          </div>
        </div>
        <div className="succession-readiness__groups">
          <section className="succession-successor-group" aria-labelledby="successor-1-readiness-title">
            <div className="succession-successor-group__heading">
              <h3 id="successor-1-readiness-title">Successor 1</h3>
              <p>Primary successor readiness outlook</p>
            </div>
            <KpiGrid>{successor1Kpis.map((kpi) => <KpiCard key={kpi.id} metric={kpi} />)}</KpiGrid>
          </section>
          <section className="succession-successor-group" aria-labelledby="successor-2-readiness-title">
            <div className="succession-successor-group__heading">
              <h3 id="successor-2-readiness-title">Successor 2</h3>
              <p>Secondary successor readiness outlook</p>
            </div>
            <KpiGrid>{successor2Kpis.map((kpi) => <KpiCard key={kpi.id} metric={kpi} />)}</KpiGrid>
          </section>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="succession-distribution-title">
        <div className="dashboard-section__heading">
          <h2 id="succession-distribution-title">Succession distribution</h2>
          <p>Position criticality and expected incumbent changes</p>
        </div>
        <div className="chart-grid succession-planning-charts">
          <ChartCard title="Positions by Criticality" description="Current positions grouped by criticality">
            {summary.criticalityChart.length ? <DonutChart data={summary.criticalityChart} total={summary.totalPositions.toLocaleString("en-US")} /> : <p>No criticality data available.</p>}
          </ChartCard>
          <ChartCard title="Incumbent change expected" description="Positions by expected change year">
            {summary.yearChart.some((item) => item.value > 0) ? <VerticalBarChart data={summary.yearChart} /> : <p>No expected change-year data available.</p>}
          </ChartCard>
        </div>
      </section>

      <section className="dashboard-section" aria-label="Succession Planning position register">
        <DataTable
          title="Succession Planning position register"
          description={importDescription(data)}
          columns={columns}
          rows={data.rows}
          getRowKey={(row) => row.id}
          downloadFileName="succession-planning-position-register"
          pageSizeOptions={[10, 25, 50]}
          defaultPageSize={50}
          groupFilters
          groupedHeaders
          neutralAppearance
        />
      </section>
    </main>
  );
}
