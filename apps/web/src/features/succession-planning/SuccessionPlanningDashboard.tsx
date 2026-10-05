"use client";

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
  successionPlanningColumns,
  type SuccessionPlanningRecord,
  type SuccessionPlanningResponse,
} from "./succession-planning.types";
import "./succession-planning.css";

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
  const readiness = new Map<Readiness, number>(readinessOrder.map((label) => [label, 0]));
  const priorities = new Map(["High", "Medium", "Low", "Not specified"].map((label) => [label, 0]));
  let positionsWithoutReadySuccessor = 0;

  for (const row of rows) {
    const priority = row.priority.trim().toLowerCase();
    const priorityLabel = priority.includes("high")
      ? "High"
      : priority.includes("medium")
        ? "Medium"
        : priority.includes("low")
          ? "Low"
          : "Not specified";
    priorities.set(priorityLabel, (priorities.get(priorityLabel) ?? 0) + 1);

    const successors = [
      [row.successor1_pers_no, row.successor1_readiness],
      [row.successor2_pers_no, row.successor2_readiness],
    ] as const;
    let hasReadySuccessor = false;
    for (const [employeeNumbers, readinessValue] of successors) {
      const count = employeeCount(employeeNumbers);
      const category = readinessCategory(readinessValue);
      if (!count || !category) continue;
      readiness.set(category, (readiness.get(category) ?? 0) + count);
      if (category !== "Ready later / TBD") hasReadySuccessor = true;
    }
    if (!hasReadySuccessor) positionsWithoutReadySuccessor += 1;
  }

  const totalPositions = rows.length;
  const readinessTotal = [...readiness.values()].reduce((sum, value) => sum + value, 0);
  const currentYear = new Date().getUTCFullYear();
  const yearLabels = [String(currentYear + 1), String(currentYear + 2), String(currentYear + 3), `${currentYear + 4}+`];
  const years = new Map(yearLabels.map((label) => [label, 0]));
  for (const row of rows) {
    const year = Number(row.incumbent_change_year.match(/\d{4}/)?.[0]);
    if (!Number.isInteger(year) || year < currentYear + 1) continue;
    const label = year >= currentYear + 4 ? `${currentYear + 4}+` : String(year);
    if (years.has(label)) years.set(label, (years.get(label) ?? 0) + 1);
  }

  return {
    totalPositions,
    positionsWithoutReadySuccessor,
    readiness,
    readinessChart: readinessOrder.map((label) => chartValue(label, readiness.get(label) ?? 0, readinessTotal)),
    priorityChart: [...priorities.entries()]
      .filter(([, value]) => value > 0)
      .map(([label, value]) => ({
        ...chartValue(label, value, totalPositions),
        color: label === "High"
          ? "var(--signal-error-pure__enabled__default__front)"
          : label === "Medium"
            ? "var(--signal-warning-pure__enabled__default__front)"
            : label === "Low"
              ? "var(--signal-success-pure__enabled__default__front)"
              : "var(--base-major__disabled__default__fill)",
      })),
    yearChart: [...years.entries()].map(([label, value]) => ({ label, value })),
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

export function SuccessionPlanningDashboard({ data }: { data: SuccessionPlanningResponse }) {
  const summary = summarize(data.rows);
  const kpis: KpiMetric[] = [
    { id: "total-positions", title: "Total positions", value: summary.totalPositions.toLocaleString("en-US"), comparisonLabel: "Current register", icon: "boschicon-bosch-ic-briefcase", iconColor: "blue" },
    { id: "ready-now", title: "Ready now", value: (summary.readiness.get("Ready now") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(summary.readiness.get("Ready now") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-checkmark", iconColor: "green" },
    { id: "ready-one-two", title: "Ready in 1-2 years", value: (summary.readiness.get("Ready in 1-2 years") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(summary.readiness.get("Ready in 1-2 years") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-people", iconColor: "orange" },
    { id: "ready-three-four", title: "Ready in 3-4 years", value: (summary.readiness.get("Ready in 3-4 years") ?? 0).toLocaleString("en-US"), comparisonLabel: percentage(summary.readiness.get("Ready in 3-4 years") ?? 0, summary.totalPositions), icon: "boschicon-bosch-ic-people", iconColor: "purple" },
    { id: "without-ready-successor", title: "Positions without ready successor", value: summary.positionsWithoutReadySuccessor.toLocaleString("en-US"), comparisonLabel: percentage(summary.positionsWithoutReadySuccessor, summary.totalPositions), icon: "boschicon-bosch-ic-alert-error", iconColor: "red" },
  ];

  return (
    <main className="overview-page">
      <header className="dashboard-section__heading succession-planning-heading">
        <h1 id="succession-planning-title">Succession Planning</h1>
        <p>Position-level incumbent coverage and successor readiness</p>
      </header>

      <section className="kpi-section succession-planning-kpis" aria-labelledby="succession-summary-title">
        <div className="kpi-section__header">
          <div>
            <h2 className="kpi-section__title" id="succession-summary-title">Succession summary</h2>
            <p className="kpi-section__description">Current position coverage and near-term successor availability</p>
          </div>
        </div>
        <KpiGrid>{kpis.map((kpi) => <KpiCard key={kpi.id} metric={kpi} />)}</KpiGrid>
      </section>

      <section className="dashboard-section" aria-labelledby="succession-distribution-title">
        <div className="dashboard-section__heading">
          <h2 id="succession-distribution-title">Succession distribution</h2>
          <p>Position priority, successor readiness, and expected incumbent changes</p>
        </div>
        <div className="chart-grid succession-planning-charts">
          <ChartCard title="Positions by priority" description="Current positions classified as high, medium, or low priority">
            {summary.priorityChart.length ? <DonutChart data={summary.priorityChart} total={summary.totalPositions.toLocaleString("en-US")} /> : <p>No priority data available.</p>}
          </ChartCard>
          <ChartCard title="Successor readiness" description="Identified successors by readiness horizon">
            {summary.readinessChart.some((item) => item.value > 0) ? <DonutChart data={summary.readinessChart.map((item, index) => ({ ...item, color: `var(--data-visualization-${(index % 6) + 1})` }))} total={summary.readinessChart.reduce((sum, item) => sum + item.value, 0).toLocaleString("en-US")} /> : <p>No successor readiness data available.</p>}
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
