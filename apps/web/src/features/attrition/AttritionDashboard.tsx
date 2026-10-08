"use client";

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import { ChartCard, HorizontalBarChart } from "@/components/charts/OverviewCharts";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import "@/components/filters/overview-filters.css";
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

type FilterState = {
  year: string;
  separationType: string;
  range: string;
  orgUnit: string;
};

const columns: DataTableColumn<AttritionRecord>[] = attritionColumns.map(
  ([key, label, group]) => ({ key, label, group, filterable: true }),
);
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toFilterState(filters: AttritionQueryFilters, selectedYear: number): FilterState {
  return {
    year: filters.year ?? String(selectedYear),
    separationType: filters.separationType ?? "All",
    range: filters.range ?? "All",
    orgUnit: filters.orgUnit ?? "All",
  };
}

function toSearchParams(filters: FilterState) {
  const params = new URLSearchParams({ year: filters.year });
  if (filters.separationType !== "All") params.set("separationType", filters.separationType);
  if (filters.range !== "All") params.set("range", filters.range);
  if (filters.orgUnit !== "All") params.set("orgUnit", filters.orgUnit);
  return params;
}

function importDescription(data: AttritionResponse) {
  if (!data.importedAt) return `${data.rows.length} filtered records`;
  const imported = new Date(data.importedAt);
  const date = Number.isNaN(imported.getTime())
    ? data.importedAt
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(imported);
  return `${data.rows.length} filtered records · Imported ${date}${data.fileName ? ` from ${data.fileName}` : ""}`;
}

function compactReasons(reasons: AttritionResponse["reasons"]) {
  if (reasons.length <= 8) return reasons;
  return [
    ...reasons.slice(0, 7),
    { label: "Other reasons", value: reasons.slice(7).reduce((total, item) => total + item.value, 0) },
  ];
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function AttritionTrend({ trend }: { trend: AttritionResponse["trend"] }) {
  const maximumCount = Math.max(...trend.map((item) => item.count), 1);
  const maximumRate = Math.max(...trend.flatMap((item) => item.rate === null ? [] : [item.rate]), 1);
  const points = trend.map((item, index) => ({
    x: index * 100 + 50,
    y: item.rate === null ? null : 220 - (item.rate / maximumRate) * 190,
  }));
  const segments: Array<Array<{ x: number; y: number }>> = [];
  points.forEach((point, index) => {
    if (point.y === null) return;
    const previous = points[index - 1];
    if (!previous || previous.y === null) segments.push([]);
    segments.at(-1)?.push({ x: point.x, y: point.y });
  });

  return (
    <div className="attrition-trend" role="img" aria-label="Monthly Attrition counts as blue bars and percentage rates as a green line">
      <div className="attrition-trend__legend" aria-hidden="true">
        <span><i className="attrition-trend__bar-key" />Attrition count</span>
        <span><i className="attrition-trend__line-key" />Attrition rate</span>
      </div>
      <div className="attrition-trend__plot">
        <div className="attrition-trend__grid" aria-hidden="true">
          <i /><i /><i /><i />
        </div>
        <div className="attrition-trend__bars">
          {trend.map((item, index) => (
            <div
              className="attrition-trend__month"
              key={item.month}
              title={`${monthLabels[index]}: ${item.count} exits${item.rate === null ? "; headcount unavailable" : `; ${item.rate.toFixed(2)}% of ${item.headcount?.toLocaleString()} headcount`}`}
            >
              <strong>{item.count}</strong>
              <span style={{ height: `${(item.count / maximumCount) * 100}%` }} />
            </div>
          ))}
        </div>
        <svg viewBox="0 0 1200 240" preserveAspectRatio="none" aria-hidden="true">
          {segments.map((segment, index) => (
            <path className="attrition-trend__rate-halo" key={`halo-${index}`} d={smoothPath(segment)} />
          ))}
          {segments.map((segment, index) => <path className="attrition-trend__rate-line" key={`line-${index}`} d={smoothPath(segment)} />)}
        </svg>
      </div>
      <div className="attrition-trend__labels" aria-hidden="true">
        {trend.map((item, index) => <span key={item.month}><strong>{monthLabels[index]}</strong><small>{item.rate === null ? "N/A" : `${item.rate.toFixed(2)}%`}</small></span>)}
      </div>
    </div>
  );
}

export function AttritionDashboard({
  data,
  activeFilters,
}: {
  data: AttritionResponse;
  activeFilters: AttritionQueryFilters;
}) {
  const router = useRouter();
  const appliedFilters = toFilterState(activeFilters, data.selectedYear);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filterOptions, setFilterOptions] = useState(data.filterOptions);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const optionRequestId = useRef(0);
  const showRange = data.organizationScope === "unrestricted";
  const showOrgUnit = data.organizationScope !== "rangeOrgUnit";
  const activeCount = Object.entries(appliedFilters).filter(([key, value]) =>
    key === "year" ? value !== String(new Date().getFullYear()) : value !== "All",
  ).length;

  const applyFilters = (filters: FilterState) => {
    setIsFiltering(true);
    startTransition(() => router.push(`/attrition?${toSearchParams(filters)}`));
  };
  const refreshFilterOptions = async (filters: FilterState) => {
    const requestId = ++optionRequestId.current;
    setIsLoadingOptions(true);
    try {
      const response = await fetch(`/api/attrition/filter-options?${toSearchParams(filters)}`);
      if (!response.ok) return;
      const options = (await response.json()) as AttritionFilterOptions;
      if (requestId === optionRequestId.current) setFilterOptions(options);
    } finally {
      if (requestId === optionRequestId.current) setIsLoadingOptions(false);
    }
  };
  const updateFilter = (key: keyof FilterState, value: string) => {
    const next = { ...draftFilters, [key]: value };
    if (key === "range") next.orgUnit = "All";
    setDraftFilters(next);
    void refreshFilterOptions(next);
  };
  const resetFilters = () => {
    const reset = { year: String(new Date().getFullYear()), separationType: "All", range: "All", orgUnit: "All" };
    setDraftFilters(reset);
    applyFilters(reset);
  };
  const percentage = (value: number, denominator: number) =>
    `${(denominator > 0 ? (value / denominator) * 100 : 0).toFixed(1)}%`;
  const headcountPercentage = (value: number) => {
    if (data.kpis.attritionRate === null) return "N/A";
    if (data.kpis.total === 0) return "0.0%";
    return `${(data.kpis.attritionRate * value / data.kpis.total).toFixed(2)}%`;
  };
  const comparisonItems = (value: number) => [
    { label: "of average headcount", value: headcountPercentage(value) },
    { label: "of total Attrition", value: percentage(value, data.kpis.total) },
  ];
  const kpis: KpiMetric[] = [
    { id: "total-attrition", title: "Total Attrition", value: String(data.kpis.total), comparisonItems: comparisonItems(data.kpis.total), icon: "boschicon-bosch-ic-people", iconColor: "blue" },
    { id: "resignations", title: "Resignations", value: String(data.kpis.resignations), comparisonItems: comparisonItems(data.kpis.resignations), icon: "boschicon-bosch-ic-exit", iconColor: "orange" },
    { id: "transfers", title: "Transfers", value: String(data.kpis.transfers), comparisonItems: comparisonItems(data.kpis.transfers), icon: "boschicon-bosch-ic-replace", iconColor: "purple" },
    { id: "retirements", title: "Retirements", value: String(data.kpis.retirements), comparisonItems: comparisonItems(data.kpis.retirements), icon: "boschicon-bosch-ic-calendar", iconColor: "green" },
    { id: "female-attrition", title: "Female Attrition", value: String(data.kpis.female), comparisonItems: comparisonItems(data.kpis.female), icon: "boschicon-bosch-ic-woman", iconColor: "red" },
  ];

  return (
    <main className="overview-page attrition-page">
      <section className="overview-filters -primary attrition-filters" aria-labelledby="attrition-filters-title">
        <form onSubmit={(event) => { event.preventDefault(); applyFilters(draftFilters); }}>
          <header className="overview-filters__header">
            <button
              className="overview-filters__toggle"
              type="button"
              aria-expanded={isExpanded}
              aria-controls="attrition-filter-controls"
              onClick={() => setIsExpanded((expanded) => !expanded)}
            >
              <i className="a-icon boschicon-bosch-ic-filter" aria-hidden="true" />
              <span id="attrition-filters-title">Filters</span>
              {activeCount > 0 && <strong>{activeCount} active</strong>}
              <i className={`a-icon ${isExpanded ? "boschicon-bosch-ic-up" : "boschicon-bosch-ic-down"}`} aria-hidden="true" />
            </button>
            {isExpanded && (
              <button className="a-button a-button--integrated -small" type="button" onClick={resetFilters}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-reset" aria-hidden="true" />
                <span className="a-button__label">Reset</span>
              </button>
            )}
          </header>

          {isExpanded && (
            <div className="overview-filters__content" id="attrition-filter-controls">
              <div className="overview-filters__grid">
                <div className="a-dropdown overview-filters__field"><label htmlFor="attrition-filter-year">Year</label><select id="attrition-filter-year" value={draftFilters.year} onChange={(event) => updateFilter("year", event.target.value)}>{filterOptions.year.map((year) => <option key={year}>{year}</option>)}</select></div>
                <div className="a-dropdown overview-filters__field"><label htmlFor="attrition-filter-type">Separation type</label><select id="attrition-filter-type" value={draftFilters.separationType} onChange={(event) => updateFilter("separationType", event.target.value)}><option>All</option>{filterOptions.separationType.map((type) => <option key={type}>{type}</option>)}</select></div>
                {showRange && <div className="a-dropdown overview-filters__field"><label htmlFor="attrition-filter-range">Range</label><select id="attrition-filter-range" value={draftFilters.range} onChange={(event) => updateFilter("range", event.target.value)}><option>All</option>{filterOptions.range.map((range) => <option key={range}>{range}</option>)}</select></div>}
                {showOrgUnit && <div className="a-dropdown overview-filters__field"><label htmlFor="attrition-filter-org-unit">Org Unit</label><select id="attrition-filter-org-unit" value={draftFilters.orgUnit} onChange={(event) => updateFilter("orgUnit", event.target.value)}><option>All</option>{filterOptions.orgUnit.map((orgUnit) => <option key={orgUnit}>{orgUnit}</option>)}</select></div>}
              </div>
              <footer className="overview-filters__footer">
                <p className="overview-filters__status">{activeCount ? `${activeCount} filter${activeCount === 1 ? "" : "s"} active` : "Current year · all authorized records"}</p>
                <div className="overview-filters__actions">
                  <button className="a-button a-button--secondary -small" type="button" onClick={resetFilters}><span className="a-button__label">Reset</span></button>
                  <button className="a-button -small" type="submit"><i className="a-icon a-button__icon boschicon-bosch-ic-filter" aria-hidden="true" /><span className="a-button__label">Apply filters</span></button>
                </div>
              </footer>
            </div>
          )}
        </form>
      </section>
      {(isLoadingOptions || isFiltering) && <p className="overview-page__filtering" role="status">{isFiltering ? "Updating dashboard..." : "Updating filter choices..."}</p>}

      <section className="kpi-section attrition-summary" aria-labelledby="attrition-summary-title">
        <div className="kpi-section__header"><div><h2 className="kpi-section__title" id="attrition-summary-title">Attrition in {data.selectedYear}</h2><p className="kpi-section__description">Filtered totals from the current Attrition register</p></div></div>
        <KpiGrid>{kpis.map((kpi) => <KpiCard key={kpi.id} metric={kpi} />)}</KpiGrid>
      </section>

      <section className="dashboard-section" aria-labelledby="attrition-analysis-title">
        <div className="dashboard-section__heading"><h2 id="attrition-analysis-title">Attrition analysis</h2><p>Monthly exits and approved reasons for the selected scope</p></div>
        <div className="chart-grid attrition-charts">
          <ChartCard title="Attrition Trend" description="Monthly count and percentage of month headcount"><AttritionTrend trend={data.trend} /></ChartCard>
          <ChartCard title="Attrition by Reason" description="Most frequent approved separation reasons">{data.reasons.length ? <HorizontalBarChart data={compactReasons(data.reasons)} /> : <p className="attrition-empty-chart">No Attrition reasons match these filters.</p>}</ChartCard>
        </div>
      </section>

      <section className="dashboard-section" aria-label="Attrition register">
        <DataTable title="Attrition Register" description={importDescription(data)} columns={columns} rows={data.rows} getRowKey={(row) => row.id} downloadFileName="attrition-register" pageSizeOptions={[10, 25, 50]} defaultPageSize={25} groupFilters groupedHeaders neutralAppearance />
      </section>
    </main>
  );
}