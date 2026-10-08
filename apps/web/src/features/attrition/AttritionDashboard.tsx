"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
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
  years: string[];
  separationTypes: string[];
  ranges: string[];
  orgUnits: string[];
};

const columns: DataTableColumn<AttritionRecord>[] = attritionColumns.map(
  ([key, label, group]) => ({ key, label, group, filterable: true }),
);
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toFilterState(filters: AttritionQueryFilters, data: AttritionResponse): FilterState {
  return {
    years: filters.year ?? data.selectedYears.map(String),
    separationTypes: filters.separationType ?? data.filterOptions.separationType,
    ranges: filters.range ?? data.filterOptions.range,
    orgUnits: filters.orgUnit ?? data.filterOptions.orgUnit,
  };
}

function toSearchParams(filters: FilterState) {
  const params = new URLSearchParams();
  filters.years.forEach((year) => params.append("year", year));
  filters.separationTypes.forEach((type) => params.append("separationType", type));
  filters.ranges.forEach((range) => params.append("range", range));
  filters.orgUnits.forEach((orgUnit) => params.append("orgUnit", orgUnit));
  return params;
}

function MultiSelectFilter({
  id,
  label,
  options,
  value,
  onChange,
  isOpen,
  onToggle,
}: {
  id: string;
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const visibleOptions = [...options, ...value.filter((item) => !options.includes(item))];
  const allSelected = visibleOptions.length > 0 && visibleOptions.every((option) => value.includes(option));
  const partiallySelected = value.length > 0 && !allSelected;
  const summary = allSelected
    ? "All"
    : value.length === 0
      ? "None selected"
    : value.length === 1
      ? value[0]
      : `${value.length} selected`;
  return (
    <div className="overview-filters__field attrition-multi-select">
      <span className="attrition-multi-select__label" id={`${id}-label`}>{label}</span>
      <div className={`attrition-multi-select__control${isOpen ? " is-open" : ""}`}>
        <button className="attrition-multi-select__trigger" type="button" aria-expanded={isOpen} aria-labelledby={`${id}-label ${id}-summary`} onClick={onToggle}>
          <span id={`${id}-summary`}>{summary}</span>
          <i className="a-icon boschicon-bosch-ic-down" aria-hidden="true" />
        </button>
        {isOpen && <div className="attrition-multi-select__options" role="group" aria-labelledby={`${id}-label`}>
          <label><input
            type="checkbox"
            checked={allSelected}
            ref={(node) => { if (node) node.indeterminate = partiallySelected; }}
            onChange={(event) => onChange(event.target.checked ? visibleOptions : [])}
          /><span>All</span></label>
          {visibleOptions.map((option) => <label key={option}>
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={() => {
                onChange(value.includes(option)
                  ? value.filter((item) => item !== option)
                  : [...value, option]);
              }}
            />
            <span>{option}</span>
          </label>)}
        </div>}
      </div>
    </div>
  );
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
  const appliedFilters = toFilterState(activeFilters, data);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filterOptions, setFilterOptions] = useState(data.filterOptions);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const optionRequestId = useRef(0);
  const filtersRef = useRef<HTMLElement>(null);
  const showRange = data.organizationScope === "unrestricted";
  const showOrgUnit = data.organizationScope !== "rangeOrgUnit";
  const isAllSelected = (value: string[], options: string[]) =>
    options.length > 0 && options.every((option) => value.includes(option));
  const activeCount = Number(appliedFilters.years.length !== 1 || appliedFilters.years[0] !== String(new Date().getFullYear()))
    + Number(!isAllSelected(appliedFilters.separationTypes, data.filterOptions.separationType))
    + Number(showRange && !isAllSelected(appliedFilters.ranges, data.filterOptions.range))
    + Number(showOrgUnit && !isAllSelected(appliedFilters.orgUnits, data.filterOptions.orgUnit));
  const hasEmptyFilterSelection = (filters: FilterState) => filters.years.length === 0
    || filters.separationTypes.length === 0
    || (showRange && filters.ranges.length === 0)
    || (showOrgUnit && filters.orgUnits.length === 0);
  const hasEmptySelection = hasEmptyFilterSelection(draftFilters);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) setOpenFilter(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const applyFilters = (filters: FilterState) => {
    if (hasEmptyFilterSelection(filters)) return;
    setOpenFilter(null);
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
  const updateMultiFilter = (key: keyof FilterState, value: string[]) => {
    const next = { ...draftFilters, [key]: value };
    if (key === "ranges") next.orgUnits = [];
    setDraftFilters(next);
    void refreshFilterOptions(next);
  };
  const resetFilters = () => {
    const reset = {
      years: [String(new Date().getFullYear())],
      separationTypes: filterOptions.separationType,
      ranges: filterOptions.range,
      orgUnits: filterOptions.orgUnit,
    };
    setDraftFilters(reset);
    setOpenFilter(null);
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
    { id: "total-attrition", title: "Total Attrition", value: String(data.kpis.total), comparisonItems: [{ label: "of average headcount", value: headcountPercentage(data.kpis.total) }], icon: "boschicon-bosch-ic-people", iconColor: "blue" },
    { id: "resignations", title: "Resignations", value: String(data.kpis.resignations), comparisonItems: comparisonItems(data.kpis.resignations), icon: "boschicon-bosch-ic-exit", iconColor: "orange" },
    { id: "transfers", title: "Transfers", value: String(data.kpis.transfers), comparisonItems: comparisonItems(data.kpis.transfers), icon: "boschicon-bosch-ic-replace", iconColor: "purple" },
    { id: "retirements", title: "Retirements", value: String(data.kpis.retirements), comparisonItems: comparisonItems(data.kpis.retirements), icon: "boschicon-bosch-ic-calendar", iconColor: "green" },
    { id: "female-attrition", title: "Female Attrition", value: String(data.kpis.female), comparisonItems: comparisonItems(data.kpis.female), icon: "boschicon-bosch-ic-woman", iconColor: "red" },
  ];

  return (
    <main className="overview-page attrition-page">
      <section className="overview-filters -primary attrition-filters" aria-labelledby="attrition-filters-title" ref={filtersRef}>
        <form onSubmit={(event) => { event.preventDefault(); applyFilters(draftFilters); }}>
          <header className="overview-filters__header">
            <button
              className="overview-filters__toggle"
              type="button"
              aria-expanded={isExpanded}
              aria-controls="attrition-filter-controls"
              onClick={() => { setIsExpanded((expanded) => !expanded); setOpenFilter(null); }}
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
                <MultiSelectFilter id="attrition-filter-year" label="Year" options={filterOptions.year} value={draftFilters.years} isOpen={openFilter === "years"} onToggle={() => setOpenFilter((current) => current === "years" ? null : "years")} onChange={(value) => updateMultiFilter("years", value)} />
                <MultiSelectFilter id="attrition-filter-type" label="Separation type" options={filterOptions.separationType} value={draftFilters.separationTypes} isOpen={openFilter === "separationTypes"} onToggle={() => setOpenFilter((current) => current === "separationTypes" ? null : "separationTypes")} onChange={(value) => updateMultiFilter("separationTypes", value)} />
                {showRange && <MultiSelectFilter id="attrition-filter-range" label="Range" options={filterOptions.range} value={draftFilters.ranges} isOpen={openFilter === "ranges"} onToggle={() => setOpenFilter((current) => current === "ranges" ? null : "ranges")} onChange={(value) => updateMultiFilter("ranges", value)} />}
                {showOrgUnit && <MultiSelectFilter id="attrition-filter-org-unit" label="Org Unit" options={filterOptions.orgUnit} value={draftFilters.orgUnits} isOpen={openFilter === "orgUnits"} onToggle={() => setOpenFilter((current) => current === "orgUnits" ? null : "orgUnits")} onChange={(value) => updateMultiFilter("orgUnits", value)} />}
              </div>
              <footer className="overview-filters__footer">
                <p className="overview-filters__status">{hasEmptySelection ? "Select at least one option in every filter" : activeCount ? `${activeCount} filter${activeCount === 1 ? "" : "s"} active` : "Current year · all authorized records"}</p>
                <div className="overview-filters__actions">
                  <button className="a-button a-button--secondary -small" type="button" onClick={resetFilters}><span className="a-button__label">Reset</span></button>
                  <button className="a-button -small" type="submit" disabled={hasEmptySelection}><i className="a-icon a-button__icon boschicon-bosch-ic-filter" aria-hidden="true" /><span className="a-button__label">Apply filters</span></button>
                </div>
              </footer>
            </div>
          )}
        </form>
      </section>
      {(isLoadingOptions || isFiltering) && <p className="overview-page__filtering" role="status">{isFiltering ? "Updating dashboard..." : "Updating filter choices..."}</p>}

      <section className="kpi-section attrition-summary" aria-labelledby="attrition-summary-title">
        <div className="kpi-section__header"><div><h2 className="kpi-section__title" id="attrition-summary-title">Attrition in {data.selectedYears.join(", ")}</h2><p className="kpi-section__description">Filtered totals from the current Attrition data</p></div></div>
        <KpiGrid>{kpis.map((kpi) => <KpiCard key={kpi.id} metric={kpi} />)}</KpiGrid>
      </section>

      <section className="dashboard-section" aria-labelledby="attrition-analysis-title">
        <div className="dashboard-section__heading"><h2 id="attrition-analysis-title">Attrition analysis</h2><p>Monthly exits and approved reasons for the selected scope</p></div>
        <div className="chart-grid attrition-charts">
          <ChartCard title="Attrition Trend" description="Monthly count and percentage of month headcount"><AttritionTrend trend={data.trend} /></ChartCard>
          <ChartCard title="Attrition by Reason" description="Most frequent approved separation reasons">{data.reasons.length ? <HorizontalBarChart data={compactReasons(data.reasons)} /> : <p className="attrition-empty-chart">No Attrition reasons match these filters.</p>}</ChartCard>
        </div>
      </section>

      <section className="dashboard-section" aria-label="Attrition records">
        <DataTable title="Attrition records" description={importDescription(data)} columns={columns} rows={data.rows} getRowKey={(row) => row.id} downloadFileName="attrition-register" pageSizeOptions={[10, 25, 50]} defaultPageSize={25} groupFilters groupedHeaders neutralAppearance />
      </section>
    </main>
  );
}