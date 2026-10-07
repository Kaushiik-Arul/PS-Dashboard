"use client";

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import {
  ChartCard,
  HorizontalBarChart,
  VerticalBarChart,
  type ChartDatum,
} from "@/components/charts/OverviewCharts";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import {
  emptyDashboardFilters,
  OverviewFilters,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";
import { KpiCard, type KpiMetric } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import {
  attritionColumns,
  type AttritionFilterOptions,
  type AttritionQueryFilters,
  type AttritionRecord,
  type AttritionResponse,
} from "./attrition.types";
import "./attrition.css";

const filterFields: readonly DashboardFilterKey[] = ["orgUnit", "range", "gender"];

const columns: DataTableColumn<AttritionRecord>[] = attritionColumns.map(
  ([key, label, group]) => ({ key, label, group, filterable: true }),
);

const dummyKpis: KpiMetric[] = [
  { id: "total-attrition", title: "Total Attrition", value: "142", comparisonLabel: "3.21% of average headcount", icon: "boschicon-bosch-ic-people", iconColor: "blue" },
  { id: "resignations", title: "Resignations", value: "78", comparisonLabel: "1.76% of average headcount", icon: "boschicon-bosch-ic-exit", iconColor: "orange" },
  { id: "transfers", title: "Transfers", value: "42", comparisonLabel: "0.95% of average headcount", icon: "boschicon-bosch-ic-replace", iconColor: "purple" },
  { id: "retirements", title: "Retirements", value: "22", comparisonLabel: "0.50% of average headcount", icon: "boschicon-bosch-ic-calendar", iconColor: "green" },
  { id: "female-attrition", title: "Female Attrition", value: "1.98%", comparisonLabel: "Dummy dashboard value", icon: "boschicon-bosch-ic-woman", iconColor: "red" },
];

const dummyTrend: ChartDatum[] = [
  { label: "Apr", value: 16 },
  { label: "May", value: 18 },
  { label: "Jun", value: 21 },
  { label: "Jul", value: 24 },
  { label: "Aug", value: 34 },
  { label: "Sep", value: 29 },
];

const dummyReasons: ChartDatum[] = [
  { label: "Career Growth", value: 42 },
  { label: "Better Opportunity", value: 28 },
  { label: "Job Satisfaction", value: 22 },
  { label: "Relocation", value: 14 },
  { label: "Compensation", value: 11 },
  { label: "Other / Personal", value: 25 },
];

function toDashboardFilters(filters: AttritionQueryFilters): DashboardFilters {
  return {
    ...emptyDashboardFilters,
    orgUnit: filters.orgUnit ?? "All",
    range: filters.range ?? "All",
    gender: filters.gender ?? "All",
  };
}

function toSearchParams(filters: DashboardFilters) {
  const params = new URLSearchParams();
  if (filters.orgUnit !== "All") params.set("orgUnit", filters.orgUnit);
  if (filters.range !== "All") params.set("range", filters.range);
  if (filters.gender !== "All") params.set("gender", filters.gender);
  return params;
}

function importDescription(data: AttritionResponse) {
  if (!data.importedAt) return "Current Attrition register";
  const imported = new Date(data.importedAt);
  const date = Number.isNaN(imported.getTime())
    ? data.importedAt
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(imported);
  return `${data.rows.length} records · Imported ${date}${data.fileName ? ` from ${data.fileName}` : ""}`;
}

export function AttritionDashboard({
  data,
  activeFilters,
}: {
  data: AttritionResponse;
  activeFilters: AttritionQueryFilters;
}) {
  const router = useRouter();
  const appliedFilters = toDashboardFilters(activeFilters);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filterOptions, setFilterOptions] = useState(data.filterOptions);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const optionRequestId = useRef(0);

  const applyFilters = (filters: DashboardFilters) => {
    const params = toSearchParams(filters);
    setIsFiltering(true);
    startTransition(() => {
      router.push(params.size ? `/attrition?${params}` : "/attrition");
    });
  };

  const refreshFilterOptions = async (filters: DashboardFilters) => {
    const requestId = ++optionRequestId.current;
    setIsLoadingOptions(true);
    try {
      const params = toSearchParams(filters);
      const response = await fetch(`/api/attrition/filter-options${params.size ? `?${params}` : ""}`);
      if (!response.ok) return;
      const options = (await response.json()) as AttritionFilterOptions;
      if (requestId === optionRequestId.current) setFilterOptions(options);
    } catch {
      // Keep the current options; Apply still validates on the server.
    } finally {
      if (requestId === optionRequestId.current) setIsLoadingOptions(false);
    }
  };

  return (
    <main className="overview-page attrition-page">
      <OverviewFilters
        value={draftFilters}
        activeValue={appliedFilters}
        fields={filterFields}
        options={{ orgUnit: filterOptions.orgUnit, range: filterOptions.range, gender: filterOptions.gender }}
        onChange={(filters) => { setDraftFilters(filters); void refreshFilterOptions(filters); }}
        onApply={() => applyFilters(draftFilters)}
        onClear={() => { setDraftFilters(emptyDashboardFilters); applyFilters(emptyDashboardFilters); }}
      />

      {isLoadingOptions && <p className="overview-page__filtering" role="status">Updating filter choices...</p>}
      {isFiltering && <p className="overview-page__filtering" role="status">Updating dashboard...</p>}

      <section className="kpi-section attrition-summary" aria-labelledby="attrition-summary-title">
        <div className="kpi-section__header">
          <div><h2 className="kpi-section__title" id="attrition-summary-title">Attrition so far</h2><p className="kpi-section__description">Temporary KPI values for dashboard layout validation</p></div>
        </div>
        <KpiGrid>{dummyKpis.map((kpi) => <KpiCard key={kpi.id} metric={kpi} />)}</KpiGrid>
      </section>

      <section className="dashboard-section" aria-labelledby="attrition-analysis-title">
        <div className="dashboard-section__heading"><h2 id="attrition-analysis-title">Attrition analysis</h2><p>Temporary chart values for dashboard layout validation</p></div>
        <div className="chart-grid attrition-charts">
          <ChartCard title="Attrition Trend" description="Monthly Attrition count (dummy data)"><VerticalBarChart data={dummyTrend} /></ChartCard>
          <ChartCard title="Attrition by Reason" description="Top separation reasons (dummy data)"><HorizontalBarChart data={dummyReasons} /></ChartCard>
        </div>
      </section>

      <section className="dashboard-section" aria-label="Attrition register">
        <DataTable
          title="Attrition Register"
          description={importDescription(data)}
          columns={columns}
          rows={data.rows}
          getRowKey={(row) => row.id}
          downloadFileName="attrition-register"
          pageSizeOptions={[10, 25, 50]}
          defaultPageSize={25}
          groupFilters
          groupedHeaders
          neutralAppearance
        />
      </section>
    </main>
  );
}