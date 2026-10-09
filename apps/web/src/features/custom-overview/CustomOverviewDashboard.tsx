"use client";

import { useDeferredValue, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/auth/csrf";
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  IndiaLocationMap,
  JoinedFunnelChart,
  MovementChart,
  RetirementRiskTable,
  VerticalBarChart,
  type ChartDatum,
} from "@/components/charts/OverviewCharts";
import {
  appendFilterValues,
  emptyDashboardFilters,
  mapWorkforceFilterOptions,
  OverviewFilters,
  reconcileDashboardFilters,
  toFilterSelection,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";
import { KpiCard, type KpiMetric } from "@/components/kpi/KpiCard";
import type { KpiValue, OverviewChartDatum, OverviewDetailMetric, OverviewEmployeeDetail, OverviewQueryFilters, OverviewResponse } from "@/features/overview/overview.types";
import { percentage, readinessCategory, summarizeSuccessionPlanning, type Readiness } from "@/features/succession-planning/succession-planning.analytics";
import type { SuccessionPlanningResponse } from "@/features/succession-planning/succession-planning.types";
import { customOverviewWidgetMap, customOverviewWidgets } from "./custom-overview.catalog";
import {
  defaultCustomOverviewWidgetIds,
  type CustomOverviewPreference,
  type CustomOverviewWidgetId,
} from "./custom-overview.types";
import "./custom-overview.css";

const filterFields: readonly DashboardFilterKey[] = [
  "functionName", "range", "orgUnit", "location", "gender", "employmentType",
];

const chartColors = [
  "var(--data-visualization-1)",
  "var(--data-visualization-2)",
  "var(--data-visualization-3)",
  "var(--data-visualization-4)",
  "var(--data-visualization-5)",
  "var(--data-visualization-6)",
] as const;

const demographicKpis: Record<string, {
  key: keyof OverviewResponse["kpis"];
  title: string;
  icon: string;
  iconColor: NonNullable<KpiMetric["iconColor"]>;
  format: "integer" | "decimal" | "percentage" | "unit";
}> = {
  "demographics.kpi.total-hc": { key: "totalHeadcount", title: "Total HC", icon: "boschicon-bosch-ic-user", iconColor: "blue", format: "integer" },
  "demographics.kpi.direct-hc": { key: "directHeadcount", title: "Direct HC", icon: "boschicon-bosch-ic-user", iconColor: "green", format: "integer" },
  "demographics.kpi.indirect-hc": { key: "indirectHeadcount", title: "Indirect HC", icon: "boschicon-bosch-ic-user", iconColor: "orange", format: "integer" },
  "demographics.kpi.female-pct": { key: "femalePercentage", title: "Female %", icon: "boschicon-bosch-ic-user", iconColor: "red", format: "percentage" },
  "demographics.kpi.avg-age": { key: "averageAge", title: "Avg age", icon: "boschicon-bosch-ic-calendar", iconColor: "purple", format: "decimal" },
  "demographics.kpi.avg-tenure": { key: "averageTenure", title: "Avg tenure", icon: "boschicon-bosch-ic-briefcase", iconColor: "blue", format: "unit" },
  "demographics.kpi.ret-3yrs": { key: "retirementWithinThreeYears", title: "RET < 3 yrs", icon: "boschicon-bosch-ic-clock", iconColor: "orange", format: "integer" },
  "demographics.kpi.maternity": { key: "maternity", title: "Maternity", icon: "boschicon-bosch-ic-user", iconColor: "purple", format: "integer" },
  "demographics.kpi.sabbatical": { key: "sabbatical", title: "Sabbatical", icon: "boschicon-bosch-ic-calendar", iconColor: "green", format: "integer" },
  "demographics.kpi.crl": { key: "crl", title: "CRL", icon: "boschicon-bosch-ic-clock", iconColor: "orange", format: "integer" },
};

const readinessWidgets: Record<string, { successor: 1 | 2; category: Readiness; title: string }> = {
  "succession.kpi.successor-1-ready-now": { successor: 1, category: "Ready now", title: "S1 Ready now" },
  "succession.kpi.successor-1-ready-one-two": { successor: 1, category: "Ready in 1-2 years", title: "S1 Ready in 1-2 years" },
  "succession.kpi.successor-1-ready-three-four": { successor: 1, category: "Ready in 3-4 years", title: "S1 Ready in 3-4 years" },
  "succession.kpi.successor-1-ready-later": { successor: 1, category: "Ready later / TBD", title: "S1 Ready later" },
  "succession.kpi.successor-2-ready-now": { successor: 2, category: "Ready now", title: "S2 Ready now" },
  "succession.kpi.successor-2-ready-one-two": { successor: 2, category: "Ready in 1-2 years", title: "S2 Ready in 1-2 years" },
  "succession.kpi.successor-2-ready-three-four": { successor: 2, category: "Ready in 3-4 years", title: "S2 Ready in 3-4 years" },
  "succession.kpi.successor-2-ready-later": { successor: 2, category: "Ready later / TBD", title: "S2 Ready later" },
};

type DetailSelection = {
  id: CustomOverviewWidgetId;
  title: string;
  source: "Demographics" | "Succession Planning";
};

type SuccessionDetailRow = {
  key: string;
  personnelNumber: string;
  name: string;
  department: string;
  positionId: string;
  positionName: string;
  readiness: string;
  rating: string;
  idpStatus: string;
  criticality: string;
};

function toDashboardFilters(filters: OverviewQueryFilters, options: OverviewResponse["filterOptions"]): DashboardFilters {
  return {
    ...emptyDashboardFilters,
    functionName: toFilterSelection(filters.functionName, options.functionName),
    orgUnit: toFilterSelection(filters.orgUnit, options.orgUnit),
    range: toFilterSelection(filters.range, options.range),
    location: toFilterSelection(filters.location, options.location),
    gender: toFilterSelection(filters.gender, options.gender),
    employmentType: toFilterSelection(filters.directOrIndirect, options.directOrIndirect),
  };
}

function toSearchParams(filters: DashboardFilters, options: OverviewResponse["filterOptions"]) {
  const params = new URLSearchParams();
  const values = [
    ["functionName", filters.functionName, options.functionName], ["orgUnit", filters.orgUnit, options.orgUnit],
    ["range", filters.range, options.range], ["location", filters.location, options.location],
    ["gender", filters.gender, options.gender], ["directOrIndirect", filters.employmentType, options.directOrIndirect],
  ] as const;
  values.forEach(([key, value, allOptions]) => appendFilterValues(params, key, value, allOptions));
  return params;
}

function formatKpi(metric: KpiValue, format: string) {
  if (metric.value === null) return "N/A";
  if (format === "integer") return metric.value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const value = metric.value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (format === "percentage") return `${value}%`;
  if (format === "unit" && metric.unit) return `${value} ${metric.unit}`;
  return value;
}

function formatDataDate(value: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatComposition(item: OverviewChartDatum) {
  const value = item.value.toLocaleString("en-US");
  return item.percentage === null ? value : `${value} (${item.percentage.toFixed(1)}%)`;
}

function mapChart(data: OverviewChartDatum[], percentageValue = false): ChartDatum[] {
  return data.map((item) => ({
    label: item.label,
    value: item.value,
    displayValue: percentageValue ? formatComposition(item) : item.value.toLocaleString("en-US"),
  }));
}

function mapDonut(data: OverviewChartDatum[]) {
  return data.map((item, index) => ({
    label: item.label,
    value: item.value,
    displayValue: formatComposition(item),
    color: chartColors[index % chartColors.length],
  }));
}

function ChartUnavailable() {
  return <p role="status">Data is not available for the selected filters.</p>;
}

function groupWidgetIds(widgetIds: CustomOverviewWidgetId[]) {
  const kpis = widgetIds.filter((id) => customOverviewWidgetMap.get(id)?.kind === "KPI");
  const charts = widgetIds.filter((id) => customOverviewWidgetMap.get(id)?.kind === "Chart");
  return { kpis, charts, ordered: [...kpis, ...charts] };
}

function matchesDetailSearch(row: object, search: string) {
  if (!search) return true;
  return Object.values(row).some((value) => String(value ?? "").toLocaleLowerCase().includes(search));
}

export function CustomOverviewDashboard({
  demographics,
  succession,
  preference,
  activeFilters,
}: {
  demographics: OverviewResponse;
  succession: SuccessionPlanningResponse;
  preference: CustomOverviewPreference;
  activeFilters: OverviewQueryFilters;
}) {
  const router = useRouter();
  const [savedWidgetIds, setSavedWidgetIds] = useState(preference.widgetIds);
  const [draftWidgetIds, setDraftWidgetIds] = useState(preference.widgetIds);
  const [isEditing, setIsEditing] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [draftFilters, setDraftFilters] = useState(toDashboardFilters(activeFilters, demographics.filterOptions));
  const [filterOptions, setFilterOptions] = useState(demographics.filterOptions);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");
  const [detailSelection, setDetailSelection] = useState<DetailSelection | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<OverviewEmployeeDetail[]>([]);
  const [successionDetails, setSuccessionDetails] = useState<SuccessionDetailRow[]>([]);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailError, setDetailError] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const optionRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const draggingWidget = useRef<CustomOverviewWidgetId | null>(null);
  const summary = summarizeSuccessionPlanning(succession.rows);
  const deferredDetailSearch = useDeferredValue(detailSearch.trim().toLocaleLowerCase());
  const visibleEmployeeDetails = employeeDetails.filter((row) => matchesDetailSearch(row, deferredDetailSearch));
  const visibleSuccessionDetails = successionDetails.filter((row) => matchesDetailSearch(row, deferredDetailSearch));

  const applyFilters = (filters: DashboardFilters) => {
    const params = toSearchParams(filters, filterOptions);
    setIsFiltering(true);
    startTransition(() => router.push(params.size ? `/overview?${params}` : "/overview"));
  };

  const refreshFilterOptions = async (filters: DashboardFilters, changedKey: DashboardFilterKey) => {
    const requestId = ++optionRequestId.current;
    const previousOptions = mapWorkforceFilterOptions(filterOptions);
    setIsLoadingOptions(true);
    try {
      const params = toSearchParams(filters, filterOptions);
      const response = await fetch(`/api/overview/filter-options${params.size ? `?${params}` : ""}`);
      if (!response.ok) return;
      const options = await response.json() as OverviewResponse["filterOptions"];
      if (requestId === optionRequestId.current) {
        setFilterOptions(options);
        setDraftFilters(reconcileDashboardFilters(
          filters,
          previousOptions,
          mapWorkforceFilterOptions(options),
          changedKey,
        ));
      }
    } catch {
      // Keep the current choices; Apply still validates filters on the server.
    } finally {
      if (requestId === optionRequestId.current) setIsLoadingOptions(false);
    }
  };

  const openKpiDetails = async (id: CustomOverviewWidgetId) => {
    const definition = customOverviewWidgetMap.get(id);
    if (!definition || definition.kind !== "KPI") return;
    const selection: DetailSelection = { id, title: definition.title, source: definition.source };
    const requestId = ++detailRequestId.current;
    setDetailSelection(selection);
    setEmployeeDetails([]);
    setSuccessionDetails([]);
    setDetailSearch("");
    setDetailError("");
    detailDialogRef.current?.showModal();

    if (definition.source === "Succession Planning") {
      if (id === "succession.kpi.total-positions") {
        setSuccessionDetails(succession.rows.map((row) => ({
          key: row.id,
          personnelNumber: row.incumbent_pers_no,
          name: row.incumbent_name,
          department: row.incumbent_org_unit,
          positionId: row.position_jd_id,
          positionName: row.jd_name,
          readiness: "",
          rating: row.incumbent_9_box_rating,
          idpStatus: "",
          criticality: row.criticality,
        })));
        return;
      }
      const readiness = readinessWidgets[id];
      if (!readiness) return;
      setSuccessionDetails(succession.rows.flatMap((row) => {
        const first = readiness.successor === 1;
        const personnelNumber = first ? row.successor1_pers_no : row.successor2_pers_no;
        const readinessValue = first ? row.successor1_readiness : row.successor2_readiness;
        if (!personnelNumber.trim() || readinessCategory(readinessValue) !== readiness.category) return [];
        return [{
          key: `${row.id}-${readiness.successor}`,
          personnelNumber,
          name: first ? row.successor1_name : row.successor2_name,
          department: first ? row.successor1_dept_code : row.successor2_dept_code,
          positionId: row.position_jd_id,
          positionName: row.jd_name,
          readiness: readinessValue,
          rating: first ? row.successor1_9_box_rating : row.successor2_9_box_rating,
          idpStatus: first ? row.successor1_idp_status : row.successor2_idp_status,
          criticality: row.criticality,
        }];
      }));
      return;
    }

    setIsLoadingDetails(true);
    try {
      const params = toSearchParams(toDashboardFilters(activeFilters, demographics.filterOptions), demographics.filterOptions);
      params.set("metric", id.replace("demographics.kpi.", "") as OverviewDetailMetric);
      const response = await fetch(`/api/overview/details?${params}`);
      const body = await response.json().catch(() => null) as OverviewEmployeeDetail[] | { message?: string } | null;
      if (!response.ok || !Array.isArray(body)) {
        throw new Error(!Array.isArray(body) && body?.message ? body.message : "Unable to load KPI details.");
      }
      if (requestId === detailRequestId.current) setEmployeeDetails(body);
    } catch (error) {
      if (requestId === detailRequestId.current) {
        setDetailError(error instanceof Error ? error.message : "Unable to load KPI details.");
      }
    } finally {
      if (requestId === detailRequestId.current) setIsLoadingDetails(false);
    }
  };

  const reorder = (source: CustomOverviewWidgetId, target: CustomOverviewWidgetId) => {
    if (source === target) return;
    const kind = customOverviewWidgetMap.get(source)?.kind;
    if (!kind || customOverviewWidgetMap.get(target)?.kind !== kind) return;
    setDraftWidgetIds((current) => {
      const grouped = groupWidgetIds(current);
      const section = kind === "KPI" ? grouped.kpis : grouped.charts;
      const nextSection = section.filter((id) => id !== source);
      const targetIndex = nextSection.indexOf(target);
      nextSection.splice(targetIndex < 0 ? nextSection.length : targetIndex, 0, source);
      return kind === "KPI"
        ? [...nextSection, ...grouped.charts]
        : [...grouped.kpis, ...nextSection];
    });
    const sourceTitle = customOverviewWidgetMap.get(source)?.title ?? "Widget";
    const targetTitle = customOverviewWidgetMap.get(target)?.title ?? "target widget";
    setReorderAnnouncement(`${sourceTitle} moved before ${targetTitle}.`);
  };

  const move = (id: CustomOverviewWidgetId, offset: number) => {
    setDraftWidgetIds((current) => {
      const grouped = groupWidgetIds(current);
      const kind = customOverviewWidgetMap.get(id)?.kind;
      const section = kind === "KPI" ? grouped.kpis : grouped.charts;
      const index = section.indexOf(id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= section.length) return current;
      const next = [...section];
      [next[index], next[target]] = [next[target], next[index]];
      return kind === "KPI"
        ? [...next, ...grouped.charts]
        : [...grouped.kpis, ...next];
    });
    setReorderAnnouncement(`${customOverviewWidgetMap.get(id)?.title ?? "Widget"} moved ${offset < 0 ? "earlier" : "later"}.`);
  };

  const save = async () => {
    const normalizedWidgetIds = groupWidgetIds(draftWidgetIds).ordered;
    setIsSaving(true);
    setMessage("");
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/dashboard-preferences/overview", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ widgetIds: normalizedWidgetIds }),
      });
      const body = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "The Overview layout could not be saved.");
      setSavedWidgetIds(normalizedWidgetIds);
      setDraftWidgetIds(normalizedWidgetIds);
      setIsEditing(false);
      setIsLibraryOpen(false);
      setMessage("Overview layout saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The Overview layout could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderWidget = (id: CustomOverviewWidgetId) => {
    const sourceLabel = customOverviewWidgetMap.get(id)?.source;
    const dataDateLabel = formatDataDate(sourceLabel === "Succession Planning" ? succession.importedAt : demographics.asOfDate);
    const demographic = demographicKpis[id];
    if (demographic) {
      return <KpiCard metric={{
        id,
        title: demographic.title,
        value: formatKpi(demographics.kpis[demographic.key], demographic.format),
        comparisonLabel: dataDateLabel,
        icon: demographic.icon,
        iconColor: demographic.iconColor,
      }} sourceLabel={sourceLabel} />;
    }

    if (id === "succession.kpi.total-positions") {
      return <KpiCard metric={{ id, title: "Total positions", value: summary.totalPositions.toLocaleString("en-US"), comparisonLabel: dataDateLabel, icon: "boschicon-bosch-ic-briefcase", iconColor: "blue" }} sourceLabel={sourceLabel} />;
    }

    const readiness = readinessWidgets[id];
    if (readiness) {
      const source = readiness.successor === 1 ? summary.successor1Readiness : summary.successor2Readiness;
      const value = source.get(readiness.category) ?? 0;
      return <KpiCard metric={{ id, title: readiness.title, value: value.toLocaleString("en-US"), comparisonLabel: percentage(value, summary.totalPositions), icon: readiness.category === "Ready now" ? "boschicon-bosch-ic-checkmark" : "boschicon-bosch-ic-people", iconColor: readiness.category === "Ready now" ? "green" : "orange" }} sourceLabel={sourceLabel} contextLabel={`Successor ${readiness.successor}`} />;
    }

    const totalHeadcount = demographics.kpis.totalHeadcount.value?.toLocaleString("en-US") ?? "N/A";
    switch (id) {
      case "demographics.chart.headcount-by-level": {
        const data = mapChart(demographics.charts.headcountByPsGroup.data, true);
        return <ChartCard title="Headcount by Level" description="Employees across levels" sourceLabel={sourceLabel}>{data.length ? <JoinedFunnelChart data={data} /> : <ChartUnavailable />}</ChartCard>;
      }
      case "demographics.chart.gender-distribution": {
        const data = mapDonut(demographics.charts.genderDistribution.data);
        return <ChartCard title="Gender distribution" description="Share of total workforce" sourceLabel={sourceLabel}>{data.length ? <DonutChart data={data} total={totalHeadcount} /> : <ChartUnavailable />}</ChartCard>;
      }
      case "demographics.chart.headcount-by-function": {
        const data = mapChart(demographics.charts.headcountByFunction.data, true);
        return <ChartCard title="Headcount by function" description="Employees across business functions" sourceLabel={sourceLabel}>{data.length ? <HorizontalBarChart data={data} /> : <ChartUnavailable />}</ChartCard>;
      }
      case "demographics.chart.headcount-by-location": {
        const data = mapChart(demographics.charts.headcountByLocation.data, true);
        return <ChartCard title="Headcount by location" description="Employees across major sites" sourceLabel={sourceLabel}>{data.length ? <IndiaLocationMap data={data} /> : <ChartUnavailable />}</ChartCard>;
      }
      case "demographics.chart.age-profile": {
        const data = mapChart(demographics.charts.ageProfile.data);
        return <ChartCard title="Age Profile" description="Headcount by age range" sourceLabel={sourceLabel}>{data.length ? <VerticalBarChart data={data} /> : <ChartUnavailable />}</ChartCard>;
      }
      case "demographics.chart.tenure-profile": {
        const data = mapChart(demographics.charts.tenureProfile.data);
        return <ChartCard title="Tenure Profile" description="Headcount by completed service" sourceLabel={sourceLabel}>{data.length ? <VerticalBarChart data={data} tone="turquoise" /> : <ChartUnavailable />}</ChartCard>;
      }
      case "demographics.chart.workforce-status": {
        const data = mapChart(demographics.charts.workforceMovement.data);
        return <ChartCard title="Workforce Status" description="Current workforce by employee group" sourceLabel={sourceLabel}>{data.length ? <MovementChart data={data} period="Current" /> : <ChartUnavailable />}</ChartCard>;
      }
      case "demographics.chart.retirement-analysis":
        return <ChartCard title="Retirement Analysis" description="Employees reaching retirement eligibility" sourceLabel={sourceLabel}>{demographics.charts.retirementRisk.length ? <RetirementRiskTable rows={demographics.charts.retirementRisk} /> : <ChartUnavailable />}</ChartCard>;
      case "succession.chart.positions-by-criticality":
        return <ChartCard title="Positions by Criticality" description="Current positions grouped by criticality" sourceLabel={sourceLabel}>{summary.criticalityChart.length ? <DonutChart data={summary.criticalityChart} total={summary.totalPositions.toLocaleString("en-US")} /> : <ChartUnavailable />}</ChartCard>;
      case "succession.chart.incumbent-change-expected":
        return <ChartCard title="Incumbent change expected" description="Positions by expected change year" sourceLabel={sourceLabel}>{summary.yearChart.length ? <VerticalBarChart data={summary.yearChart} /> : <ChartUnavailable />}</ChartCard>;
    }
  };

  const visibleIds = isEditing ? draftWidgetIds : savedWidgetIds;

  return (
    <main className={`overview-page custom-overview${isEditing ? " custom-overview--editing" : ""}`}>
      <OverviewFilters
        value={draftFilters}
        activeValue={toDashboardFilters(activeFilters, demographics.filterOptions)}
        fields={filterFields}
        options={mapWorkforceFilterOptions(filterOptions)}
        onChange={(filters, changedKey) => { setDraftFilters(filters); void refreshFilterOptions(filters, changedKey); }}
        onApply={() => applyFilters(draftFilters)}
        onClear={() => {
          const resetFilters = toDashboardFilters({}, demographics.filterOptions);
          setDraftFilters(resetFilters);
          applyFilters(resetFilters);
        }}
        headerActions={(
          <div className="custom-overview__actions">
            {isEditing ? <>
              <button className="a-button a-button--secondary -small" type="button" disabled={isSaving} onClick={() => { setDraftWidgetIds(savedWidgetIds); setIsEditing(false); setIsLibraryOpen(false); setMessage(""); }}>
                <span className="a-button__label">Cancel</span>
              </button>
              <button className="a-button a-button--primary -small" type="button" disabled={isSaving} onClick={() => void save()}>
                <i className="a-icon a-button__icon boschicon-bosch-ic-checkmark" aria-hidden="true" />
                <span className="a-button__label">{isSaving ? "Saving..." : "Done"}</span>
              </button>
            </> : <button className="a-button a-button--secondary -small" type="button" onClick={() => { setDraftWidgetIds(savedWidgetIds); setIsEditing(true); setMessage(""); }}>
              <i className="a-icon a-button__icon boschicon-bosch-ic-edit" aria-hidden="true" />
              <span className="a-button__label">Customize</span>
            </button>}
          </div>
        )}
      />

      <header className="custom-overview__header">
        <div>
          <div className="custom-overview__title-row">
            {message && <span className="custom-overview__message" role="status">{message}</span>}
          </div>
          {isEditing && <p>Add, remove, and reorder widgets. Changes are saved when you select Done.</p>}
        </div>
        {isEditing && <div className="custom-overview__edit-actions">
          <button className="a-button a-button--secondary -small" type="button" onClick={() => setIsLibraryOpen((open) => !open)}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-add" aria-hidden="true" />
            <span className="a-button__label">Add widgets</span>
          </button>
          <button className="a-button a-button--secondary -small" type="button" onClick={() => setDraftWidgetIds([...defaultCustomOverviewWidgetIds])}>
            <i className="a-icon a-button__icon boschicon-bosch-ic-reset" aria-hidden="true" />
            <span className="a-button__label">Reset default</span>
          </button>
        </div>}
      </header>

      <span className="custom-overview__sr-status" aria-live="polite">{reorderAnnouncement}</span>
      {isLoadingOptions && <p className="overview-page__filtering" role="status">Updating filter choices...</p>}
      {isFiltering && <p className="overview-page__filtering" role="status">Updating Overview...</p>}

      {isEditing && isLibraryOpen && <section className="custom-overview-library" aria-labelledby="widget-library-title">
        <div className="custom-overview-library__heading">
          <div><h2 id="widget-library-title">Widget library</h2><p>Select KPIs and charts from Demographics and Succession Planning.</p></div>
          <button className="a-button a-button--integrated" type="button" aria-label="Close widget library" onClick={() => setIsLibraryOpen(false)}><i className="a-icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
        </div>
        {["Demographics", "Succession Planning"].map((source) => <section key={source}>
          <h3>{source}</h3>
          <div className="custom-overview-library__grid">
            {customOverviewWidgets.filter((widget) => widget.source === source).map((widget) => {
              const selected = draftWidgetIds.includes(widget.id);
              return <button key={widget.id} className={`custom-overview-library__item${selected ? " is-selected" : ""}`} type="button" onClick={() => setDraftWidgetIds((current) => {
                if (selected) return current.filter((id) => id !== widget.id);
                return groupWidgetIds([...current, widget.id]).ordered;
              })}>
                <span><strong>{widget.title}</strong><small>{widget.kind}</small></span>
                <i className={`a-icon ${selected ? "boschicon-bosch-ic-checkmark" : "boschicon-bosch-ic-add"}`} aria-hidden="true" />
              </button>;
            })}
          </div>
        </section>)}
      </section>}

      {visibleIds.length === 0 ? <section className="custom-overview__empty">
        <i className="a-icon boschicon-bosch-ic-chart-bar" aria-hidden="true" />
        <h2>No widgets selected</h2>
        <p>{isEditing ? "Use Add widgets to build your Overview." : "Customize this page to add your first widget."}</p>
      </section> : <div className="custom-overview-sections">
        {([
          { kind: "KPI" as const, title: "Key Performance Indicators", description: "Selected workforce and succession measures" },
          { kind: "Chart" as const, title: "Charts and Reports", description: "Selected visual analysis and reporting views" },
        ]).map((section) => {
          const sectionIds = visibleIds.filter((id) => customOverviewWidgetMap.get(id)?.kind === section.kind);
          if (sectionIds.length === 0 && !isEditing) return null;
          return <section className="custom-overview-section" aria-labelledby={`custom-overview-${section.kind.toLowerCase()}-title`} key={section.kind}>
            <div className="custom-overview-section__heading">
              <h2 id={`custom-overview-${section.kind.toLowerCase()}-title`}>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            {sectionIds.length === 0 ? <div className="custom-overview-section__empty">No {section.kind === "KPI" ? "KPIs" : "charts"} selected. Use Add widgets to include one.</div> : <div className={`custom-overview-grid custom-overview-grid--${section.kind.toLowerCase()}`}>
              {sectionIds.map((id, index) => {
                const definition = customOverviewWidgetMap.get(id);
                if (!definition) return null;
                return <div
                  className={`custom-overview-widget custom-overview-widget--${definition.kind.toLowerCase()}`}
                  data-custom-widget-id={id}
                  key={id}
                  onPointerMove={(event) => {
                    if (!draggingWidget.current) return;
                    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-custom-widget-id]")?.dataset.customWidgetId as CustomOverviewWidgetId | undefined;
                    if (target) reorder(draggingWidget.current, target);
                  }}
                >
                  {isEditing && <div className="custom-overview-widget__toolbar">
                    <button type="button" className="custom-overview-widget__drag" aria-label={`Drag ${definition.title}`} onPointerDown={(event) => { draggingWidget.current = id; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { draggingWidget.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { draggingWidget.current = null; }}>
                      <i className="a-icon boschicon-bosch-ic-drag-handle" aria-hidden="true" />
                    </button>
                    <div>
                      <button type="button" aria-label={`Move ${definition.title} earlier`} disabled={index === 0} onClick={() => move(id, -1)}><i className="a-icon boschicon-bosch-ic-arrow-left" aria-hidden="true" /></button>
                      <button type="button" aria-label={`Move ${definition.title} later`} disabled={index === sectionIds.length - 1} onClick={() => move(id, 1)}><i className="a-icon boschicon-bosch-ic-arrow-right" aria-hidden="true" /></button>
                      <button type="button" aria-label={`Remove ${definition.title}`} onClick={() => setDraftWidgetIds((current) => current.filter((widgetId) => widgetId !== id))}><i className="a-icon boschicon-bosch-ic-close" aria-hidden="true" /></button>
                    </div>
                  </div>}
                  <div className="custom-overview-widget__content">
                    {definition.kind === "KPI" && !isEditing ? <div
                      className="custom-overview-widget__kpi-trigger"
                      role="button"
                      tabIndex={0}
                      aria-label={`Show people represented by ${definition.title}`}
                      onClick={() => void openKpiDetails(id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void openKpiDetails(id);
                        }
                      }}
                    >{renderWidget(id)}</div> : renderWidget(id)}
                  </div>
                </div>;
              })}
            </div>}
          </section>;
        })}
      </div>}

      <dialog className="custom-overview-detail" ref={detailDialogRef} aria-labelledby="custom-overview-detail-title" onClose={() => {
        detailRequestId.current += 1;
        setDetailSelection(null);
        setDetailSearch("");
        setDetailError("");
        setIsLoadingDetails(false);
      }}>
        <div className="custom-overview-detail__content">
          <header>
            <div>
              <span>{detailSelection?.source}</span>
              <h2 id="custom-overview-detail-title">{detailSelection?.title ?? "KPI details"}</h2>
              <p>{detailSelection?.source === "Demographics"
                ? `${visibleEmployeeDetails.length.toLocaleString("en-US")} of ${employeeDetails.length.toLocaleString("en-US")} employees`
                : `${visibleSuccessionDetails.length.toLocaleString("en-US")} of ${successionDetails.length.toLocaleString("en-US")} records`}</p>
            </div>
            <button className="a-button a-button--integrated" type="button" aria-label="Close KPI details" onClick={() => detailDialogRef.current?.close()}>
              <i className="a-icon a-button__icon boschicon-bosch-ic-close" aria-hidden="true" />
            </button>
          </header>
          <div className="custom-overview-detail__filter">
            <label htmlFor="custom-overview-detail-search">Filter people</label>
            <input id="custom-overview-detail-search" type="search" value={detailSearch} placeholder="Search employee, function, department or location" onChange={(event) => setDetailSearch(event.target.value)} />
          </div>
          {isLoadingDetails ? <p className="custom-overview-detail__empty" role="status">Loading KPI details...</p>
            : detailError ? <p className="custom-overview-detail__empty" role="alert">{detailError}</p>
            : detailSelection?.source === "Demographics" ? (visibleEmployeeDetails.length ? <div className="custom-overview-detail__table-wrap">
              <table>
                <thead><tr><th scope="col">Employee No.</th><th scope="col">Function</th><th scope="col">Org unit</th><th scope="col">Range</th><th scope="col">Location</th><th scope="col">Gender</th><th scope="col">Type</th><th scope="col">Age</th><th scope="col">Tenure</th><th scope="col">Retirement date</th></tr></thead>
                <tbody>{visibleEmployeeDetails.map((row) => <tr key={row.personnelNumber}>
                  <td>{row.personnelNumber}</td><td>{row.functionName ?? "-"}</td><td>{row.orgUnit ?? "-"}</td><td>{row.range ?? "-"}</td><td>{row.location ?? "-"}</td><td>{row.gender ?? "-"}</td><td>{row.directOrIndirect ?? "-"}</td><td>{row.ageYears ?? "-"}</td><td>{row.tenureYears ?? "-"}</td><td>{row.retirementDate ?? "-"}</td>
                </tr>)}</tbody>
              </table>
            </div> : <p className="custom-overview-detail__empty">No matching employees.</p>)
              : (visibleSuccessionDetails.length ? <div className="custom-overview-detail__table-wrap">
                <table>
                  <thead><tr><th scope="col">Employee No.</th><th scope="col">Name</th><th scope="col">Department</th><th scope="col">Position ID</th><th scope="col">Position</th><th scope="col">Readiness</th><th scope="col">9 Box</th><th scope="col">IDP status</th><th scope="col">Criticality</th></tr></thead>
                  <tbody>{visibleSuccessionDetails.map((row) => <tr key={row.key}>
                    <td>{row.personnelNumber || "-"}</td><td>{row.name || "-"}</td><td>{row.department || "-"}</td><td>{row.positionId || "-"}</td><td>{row.positionName || "-"}</td><td>{row.readiness || "-"}</td><td>{row.rating || "-"}</td><td>{row.idpStatus || "-"}</td><td>{row.criticality || "-"}</td>
                  </tr>)}</tbody>
                </table>
              </div> : <p className="custom-overview-detail__empty">No matching records.</p>)}
        </div>
      </dialog>
    </main>
  );
}
