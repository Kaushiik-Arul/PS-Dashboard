"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { getCsrfToken } from "@/auth/csrf";
import {
  emptyDashboardFilters,
  OverviewFilters,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";

import { KpiCard, type KpiMetric } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";

import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
  type ChartDatum,
} from "@/components/charts/OverviewCharts";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/DataTable";

import "./talent-pipeline.css";
import { AvailableTalentManagement } from "../hrbp-point/AvailableTalentManagement";
import { PoolRegisterManagement } from "../hrbp-point/PoolRegisterManagement";
import type {
  TalentPipelineChartDatum,
  TalentPipelineFilterOptions,
  TalentPipelineHistoryState,
  TalentPipelineQueryFilters,
  TalentPipelineResponse,
} from "./talent-pipeline.types";

const talentFilterFields: readonly DashboardFilterKey[] = [
  "functionName", "orgUnit", "range", "location", "gender", "employmentType",
];

const currentDate = new Date();
const latestSnapshotMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1))
  .toISOString()
  .slice(0, 7);

function toDashboardFilters(filters: TalentPipelineQueryFilters): DashboardFilters {
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

function displayValue(item: TalentPipelineChartDatum) {
  const count = item.value.toLocaleString("en-US");
  return item.percentage === null
    ? count
    : `${count} (${item.percentage.toLocaleString("en-US", { maximumFractionDigits: 1 })}%)`;
}

function mapChart(data: TalentPipelineChartDatum[]): ChartDatum[] {
  return data.map((item) => ({
    label: item.label,
    value: item.value,
    displayValue: displayValue(item),
  }));
}

function mapDonut(
  data: TalentPipelineChartDatum[],
  colors: Record<string, string>,
): Array<ChartDatum & { color: string }> {
  return data.map((item, index) => ({
    label: item.label,
    value: item.value,
    displayValue: displayValue(item),
    color: colors[item.label] ?? `var(--data-visualization-${(index % 6) + 1})`,
  }));
}

function percentageLabel(value: number | null, denominator: string) {
  return value === null ? "N/A" : `${value.toFixed(1)}% of ${denominator}`;
}

function ChartUnavailable() {
  return <p role="status">Data is not available for the selected filters.</p>;
}

/* =========================================================
   TABLE 2
   OPEN STEP POSITIONS
========================================================= */

interface ActiveStepRow {
  id: string; slNo: string | null; year: number; persNo: string; employeeName: string;
  grp: string | null; initiatedBy: string | null; exchangedWith: string | null;
  stepFrom: string; stepTo: string | null; entityFrom: string | null; entityTo: string | null;
  gbFrom: string | null; gbTo: string | null; functionFrom: string | null; functionTo: string | null;
  deptFrom: string | null; deptTo: string | null; locationFrom: string | null; locationTo: string | null;
}

const activeStepColumns: DataTableColumn<ActiveStepRow>[] = [
  { key: "year", label: "Year", group: "Employee", filterable: true },
  { key: "persNo", label: "E No", group: "Employee", filterable: true },
  { key: "employeeName", label: "E Name", group: "Employee", filterable: true },
  { key: "grp", label: "Group", group: "Employee", filterable: true },
  { key: "initiatedBy", label: "Initiated by (HRBP)", group: "Exchange", filterable: true },
  { key: "exchangedWith", label: "Exchanged with", group: "Exchange", filterable: true },
  { key: "stepFrom", label: "STEP Period From", group: "STEP Period", filterable: true },
  { key: "stepTo", label: "STEP Period To", group: "STEP Period", filterable: true },
  { key: "entityFrom", label: "Entity From", group: "Entity", filterable: true },
  { key: "entityTo", label: "Entity To", group: "Entity", filterable: true },
  { key: "gbFrom", label: "GB From", group: "GB", filterable: true },
  { key: "gbTo", label: "GB To", group: "GB", filterable: true },
  { key: "functionFrom", label: "Function From", group: "Function", filterable: true },
  { key: "functionTo", label: "Function To", group: "Function", filterable: true },
  { key: "deptFrom", label: "Dept From", group: "Dept", filterable: true },
  { key: "deptTo", label: "Dept To", group: "Dept", filterable: true },
  { key: "locationFrom", label: "Location From", group: "Location", filterable: true },
  { key: "locationTo", label: "Location To", group: "Location", filterable: true },
];

/* =========================================================
   PAGE
========================================================= */

export function TalentPipelineDashboard({
  data,
  activeFilters,
  historyState,
  isSnapshot,
}: {
  data: TalentPipelineResponse;
  activeFilters: TalentPipelineQueryFilters;
  historyState: TalentPipelineHistoryState | null;
  isSnapshot: boolean;
}) {
  const router = useRouter();
  const appliedFilters = toDashboardFilters(activeFilters);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filterOptions, setFilterOptions] = useState(data.filterOptions);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const optionRequestId = useRef(0);
  const [activeStepRows, setActiveStepRows] = useState<ActiveStepRow[]>([]);
  const [activeStepError, setActiveStepError] = useState("");
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotMonth, setSnapshotMonth] = useState(latestSnapshotMonth);
  const [isSnapshotPublisherOpen, setIsSnapshotPublisherOpen] = useState(false);
  useEffect(() => {
    if (isSnapshot) return;
    const controller = new AbortController();
    void fetch("/api/hrbp-point/active-step", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Active STEP could not be loaded.");
      return response.json() as Promise<ActiveStepRow[]>;
    }).then((rows) => setActiveStepRows(rows)).catch((error) => {
      if (!controller.signal.aborted) setActiveStepError(error instanceof Error ? error.message : "Active STEP could not be loaded.");
    });
    return () => controller.abort();
  }, [isSnapshot]);

  const preserveReportingMonth = (params: URLSearchParams) => {
    if (activeFilters.reportingMonth) params.set("reportingMonth", activeFilters.reportingMonth);
    return params;
  };

  const applyFilters = (filters: DashboardFilters) => {
    const params = preserveReportingMonth(toSearchParams(filters));
    setIsFiltering(true);
    startTransition(() => {
      router.push(params.size ? `/talent-pipeline?${params}` : "/talent-pipeline");
    });
  };

  const refreshFilterOptions = async (filters: DashboardFilters) => {
    if (isSnapshot) return;
    const requestId = ++optionRequestId.current;
    setIsLoadingOptions(true);
    try {
      const params = preserveReportingMonth(toSearchParams(filters));
      const query = params.size ? `?${params}` : "";
      const response = await fetch(`/api/talent-pipeline/filter-options${query}`);
      if (!response.ok) return;
      const options = (await response.json()) as TalentPipelineFilterOptions;
      if (requestId === optionRequestId.current) setFilterOptions(options);
    } catch {
      // Retain current choices; Apply still validates filters on the server.
    } finally {
      if (requestId === optionRequestId.current) setIsLoadingOptions(false);
    }
  };

  const saveSnapshot = async () => {
    setIsSavingSnapshot(true);
    setSnapshotMessage("");
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/talent-pipeline/snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ reportingMonth: snapshotMonth }),
      });
      const body = await response.json().catch(() => null) as { message?: string; reportingMonth?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "The monthly snapshot could not be saved.");
      setSnapshotMessage(`Saved Talent Pipeline snapshot for ${body?.reportingMonth ?? snapshotMonth}.`);
      router.refresh();
    } catch (error) {
      setSnapshotMessage(error instanceof Error ? error.message : "The monthly snapshot could not be saved.");
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const kpis: KpiMetric[] = [
    { id: "total-talent-pool", title: "Total talent pool", value: data.kpis.totalTalentPool.value.toLocaleString("en-US"), comparisonLabel: "Current register", icon: "boschicon-bosch-ic-user", iconColor: "blue" },
    { id: "active-talent-pool", title: "Active talent pool", value: data.kpis.activeTalentPool.value.toLocaleString("en-US"), comparisonLabel: percentageLabel(data.kpis.activeTalentPool.percentage, "total"), icon: "boschicon-bosch-ic-user", iconColor: "green" },
    { id: "passive-talent-pool", title: "Passive talent pool members", value: data.kpis.passiveTalentPool.value.toLocaleString("en-US"), comparisonLabel: percentageLabel(data.kpis.passiveTalentPool.percentage, "total"), icon: "boschicon-bosch-ic-user", iconColor: "orange" },
    { id: "development-pool", title: "Development pool", value: data.kpis.developmentPool.value.toLocaleString("en-US"), comparisonLabel: "Current register", icon: "boschicon-bosch-ic-chart-line", iconColor: "purple" },
    { id: "female-talent", title: "Female talent", value: data.kpis.femaleTalent.value.toLocaleString("en-US"), comparisonLabel: percentageLabel(data.kpis.femaleTalent.percentage, "development pool"), icon: "boschicon-bosch-ic-user", iconColor: "red" },
    { id: "key-to-retain", title: "Key to retain", value: data.kpis.keyToRetain.value.toLocaleString("en-US"), comparisonLabel: percentageLabel(data.kpis.keyToRetain.percentage, "development pool"), icon: "boschicon-bosch-ic-user", iconColor: "orange" },
    { id: "future-talent", title: "Future talent", value: data.kpis.futureTalent.value.toLocaleString("en-US"), comparisonLabel: percentageLabel(data.kpis.futureTalent.percentage, "development pool"), icon: "boschicon-bosch-ic-chart-line", iconColor: "green" },
    { id: "change-wanted", title: "Change wanted", value: data.kpis.changeWanted.value.toLocaleString("en-US"), comparisonLabel: percentageLabel(data.kpis.changeWanted.percentage, "development pool"), icon: "boschicon-bosch-ic-refresh", iconColor: "blue" },
    { id: "talent-pool-expiring", title: "Talent pool expiring soon", value: "", comparisonLabel: "", breakdown: [
      { label: "≤ 6 months", value: data.kpis.talentPoolExpiring.within6Months.toLocaleString("en-US") },
      { label: "≤ 12 months", value: data.kpis.talentPoolExpiring.within12Months.toLocaleString("en-US") },
    ], icon: "boschicon-bosch-ic-calendar", iconColor: "blue" },
  ];
  const talentPoolDistribution = mapChart(data.charts.talentPoolDistribution.data);
  const activePassiveDistribution = mapDonut(data.charts.activePassiveDistribution.data, { Active: "var(--data-visualization-3)", Passive: "var(--data-visualization-5)" });
  const nominationStatusDistribution = mapDonut(data.charts.nominationStatusDistribution.data, { Green: "var(--signal-success-pure__enabled__default__front)", Amber: "var(--signal-warning-pure__enabled__default__front)", Red: "var(--signal-error-pure__enabled__default__front)" });
  const developmentPoolDistribution = mapDonut(data.charts.developmentPoolDistribution.data, { "Female talent": "var(--data-visualization-4)", "Key to retain": "var(--data-visualization-1)", "Future talent": "var(--data-visualization-3)", "Change wanted": "var(--data-visualization-5)" });
  const talentGenderDistribution = mapDonut(data.charts.talentGenderDistribution.data, { Male: "var(--data-visualization-1)", Female: "var(--data-visualization-4)" });
  const talentRangeDistribution = mapChart(data.charts.talentRangeDistribution.data);
  const talentRangeMaximum = Math.max(...talentRangeDistribution.map((item) => item.value), 0);
  const rangeColumnSize = Math.ceil(talentRangeDistribution.length / 2);
  const talentRangeColumns = [
    talentRangeDistribution.slice(0, rangeColumnSize),
    talentRangeDistribution.slice(rangeColumnSize),
  ].filter((column) => column.length > 0);
  const talentTotal = data.kpis.totalTalentPool.value.toLocaleString("en-US");
  const developmentTotal = data.kpis.developmentPool.value.toLocaleString("en-US");
  const nominationTotal = data.charts.nominationStatusDistribution.data.reduce((sum, item) => sum + item.value, 0).toLocaleString("en-US");
  const periodOptions = historyState ? [
    {
      value: "",
      label: "Current",
    },
    ...historyState.snapshotMonths
      .map((month) => {
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
        fields={talentFilterFields}
        filtersDisabled={isSnapshot}
        options={{ functionName: filterOptions.functionName, orgUnit: filterOptions.orgUnit, range: filterOptions.range, location: filterOptions.location, gender: filterOptions.gender, employmentType: filterOptions.directOrIndirect }}
        onChange={(filters) => { setDraftFilters(filters); void refreshFilterOptions(filters); }}
        onPeriodChange={historyState ? (reportingMonth) => {
          const params = new URLSearchParams();
          if (reportingMonth) params.set("reportingMonth", reportingMonth);
          startTransition(() => router.push(params.size ? `/talent-pipeline?${params}` : "/talent-pipeline"));
        } : undefined}
        onApply={() => applyFilters(draftFilters)}
        onClear={() => { setDraftFilters(emptyDashboardFilters); applyFilters(emptyDashboardFilters); }}
        headerActions={historyState && !isSnapshot ? (
          <div className="talent-history-menu">
            <button
              className="a-button a-button--secondary -small talent-history-menu__trigger"
              type="button"
              aria-label="Save monthly snapshot"
              aria-expanded={isSnapshotPublisherOpen}
              aria-controls="talent-snapshot-publisher"
              title="Save monthly snapshot"
              onClick={() => setIsSnapshotPublisherOpen((isOpen) => !isOpen)}
            >
              <i className="a-icon a-button__icon boschicon-bosch-ic-save" aria-hidden="true" />
              <span className="a-button__label">Save monthly snapshot</span>
            </button>
            {isSnapshotPublisherOpen && (
              <div className="talent-history-popover" id="talent-snapshot-publisher" role="dialog" aria-label="Monthly snapshot">
                <strong>Save monthly snapshot</strong>
                <p>Archive the organization-wide KPI and chart results for a reporting month.</p>
                <label className="talent-history-month" htmlFor="talent-snapshot-month">
                  <span>Reporting month</span>
                  <input id="talent-snapshot-month" type="month" max={latestSnapshotMonth} value={snapshotMonth} disabled={isSavingSnapshot} onChange={(event) => setSnapshotMonth(event.target.value)} />
                </label>
                <button className="a-button a-button--secondary -small" type="button" disabled={!snapshotMonth || isSavingSnapshot} onClick={() => void saveSnapshot()}>
                  <i className="a-icon a-button__icon boschicon-bosch-ic-save" aria-hidden="true" />
                  <span className="a-button__label">{isSavingSnapshot ? "Saving..." : "Save snapshot"}</span>
                </button>
                {snapshotMessage && <p className="talent-history-popover__message" role="status">{snapshotMessage}</p>}
              </div>
            )}
          </div>
        ) : undefined}
      />

      {isLoadingOptions && <p className="overview-page__filtering" role="status">Updating filter choices...</p>}
      {isFiltering && <p className="overview-page__filtering" role="status">Updating dashboard...</p>}

      {/* KPI SECTION */}

      <section
        className="kpi-section"
        aria-labelledby="talent-pipeline-summary-title"
      >
        <div className="kpi-section__header">
          <div>
            <h1
              id="talent-pipeline-summary-title"
              className="kpi-section__title"
            >
              Talent pipeline summary
            </h1>

            <p className="kpi-section__description">
              Talent pool composition, nomination status, and upcoming
              expirations
            </p>
          </div>
        </div>

        <KpiGrid>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} metric={kpi} />
          ))}
        </KpiGrid>
      </section>

      {/* CHARTS */}

      <section
        className="dashboard-section"
        aria-labelledby="talent-distribution-title"
      >
        <div className="dashboard-section__heading">
          <h2 id="talent-distribution-title">
            Talent pool distribution
          </h2>

          <p>
            Talent pool level, activity, nomination, gender, and range
            composition
          </p>
        </div>

        <div className="chart-grid chart-grid--composition">
          <ChartCard
            title="Talent pool distribution"
            description="Members by talent pool level"
          >
            {talentPoolDistribution.length ? <VerticalBarChart data={talentPoolDistribution} /> : <ChartUnavailable />}
          </ChartCard>

          <ChartCard
            title="Active vs passive"
            description="Current status of talent pool members"
          >
            {activePassiveDistribution.length ? <DonutChart data={activePassiveDistribution} total={talentTotal} /> : <ChartUnavailable />}
          </ChartCard>

          <ChartCard
            title="Nomination status (RAG)"
            description="Nomination health across the talent pool"
          >
            {nominationStatusDistribution.length ? <DonutChart data={nominationStatusDistribution} total={nominationTotal} /> : <ChartUnavailable />}
          </ChartCard>

          <ChartCard
            title="Development pool distribution"
            description="Members across development pool categories"
          >
            {developmentPoolDistribution.length ? <DonutChart data={developmentPoolDistribution} total={developmentTotal} /> : <ChartUnavailable />}
          </ChartCard>

          <ChartCard
            title="Gender and range distribution"
            description="Talent pool composition by gender and range"
            className="talent-demographics-card"
          >
            <div className="talent-demographics">
              <div className="talent-demographics__group">
                <h3>By gender</h3>

                {talentGenderDistribution.length ? <DonutChart data={talentGenderDistribution} total={talentTotal} /> : <ChartUnavailable />}
              </div>

              <div className="talent-demographics__group">
                <h3>By range</h3>

                {talentRangeColumns.length ? (
                  <div className="talent-range-columns">
                    {talentRangeColumns.map((column) => (
                      <HorizontalBarChart
                        key={column[0].label}
                        data={column}
                        maximum={talentRangeMaximum}
                      />
                    ))}
                  </div>
                ) : <ChartUnavailable />}
              </div>
            </div>
          </ChartCard>
        </div>
      </section>

      {/* =====================================================
          TALENT / STEP TABLES
      ===================================================== */}

      {!isSnapshot && <section
        className="dashboard-section talent-register-section"
        aria-labelledby="talent-register-title"
      >
        <div className="dashboard-section__heading">
          <h2 id="talent-register-title">
            Talent and STEP registers
          </h2>

          <p>
            Talent availability, STEP opportunities and
            development information
          </p>
        </div>

        {/* TOP TWO TABLES */}

        <div className="talent-table-grid">
          <AvailableTalentManagement kind="available" />

          <div className="talent-active-step">
            {activeStepError && <p role="alert">{activeStepError}</p>}
            <DataTable
              title="Active STEP"
              description="Every employee assignment in the latest confirmed STEP workbook"
              columns={activeStepColumns}
              rows={activeStepRows}
              getRowKey={(row) => row.id}
              downloadFileName="active-step"
              pageSizeOptions={[5, 10, 25]}
              groupFilters
            />
          </div>
        </div>

        <PoolRegisterManagement kind="development" />
        <PoolRegisterManagement kind="talent" />
      </section>}
    </main>
  );
}
