"use client";

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
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
  emptyDashboardFilters,
  OverviewFilters,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";
import { KpiCard, type KpiMetric } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import type {
  KpiValue,
  OverviewChartDatum,
  OverviewFilterOptions,
  OverviewAvailableMonths,
  OverviewKpis,
  OverviewQueryFilters,
  OverviewResponse,
} from "./overview.types";

type KpiDefinition = {
  key: keyof OverviewKpis;
  id: string;
  title: string;
  icon: string;
  iconColor: NonNullable<KpiMetric["iconColor"]>;
  format: "integer" | "decimal" | "percentage" | "unit";
};

const kpiDefinitions: readonly KpiDefinition[] = [
  { key: "totalHeadcount", id: "total-hc", title: "Total HC", icon: "boschicon-bosch-ic-user", iconColor: "blue", format: "integer" },
  { key: "directHeadcount", id: "direct-hc", title: "Direct HC", icon: "boschicon-bosch-ic-user", iconColor: "green", format: "integer" },
  { key: "indirectHeadcount", id: "indirect-hc", title: "Indirect HC", icon: "boschicon-bosch-ic-user", iconColor: "orange", format: "integer" },
  { key: "femalePercentage", id: "female-pct", title: "Female %", icon: "boschicon-bosch-ic-user", iconColor: "red", format: "percentage" },
  { key: "averageAge", id: "avg-age", title: "Avg age", icon: "boschicon-bosch-ic-calendar", iconColor: "purple", format: "decimal" },
  { key: "averageTenure", id: "avg-tenure", title: "Avg tenure", icon: "boschicon-bosch-ic-briefcase", iconColor: "blue", format: "unit" },
  { key: "retirementWithinThreeYears", id: "ret-3yrs", title: "RET < 3 yrs", icon: "boschicon-bosch-ic-clock", iconColor: "orange", format: "integer" },
  { key: "maternity", id: "maternity", title: "Maternity", icon: "boschicon-bosch-ic-user", iconColor: "purple", format: "integer" },
  { key: "sabbatical", id: "sabbatical", title: "Sabbatical", icon: "boschicon-bosch-ic-calendar", iconColor: "green", format: "integer" },
  { key: "crl", id: "crl", title: "CRL", icon: "boschicon-bosch-ic-clock", iconColor: "orange", format: "integer" },
];

const chartColors = [
  "var(--data-visualization-1)",
  "var(--data-visualization-2)",
  "var(--data-visualization-3)",
  "var(--data-visualization-4)",
  "var(--data-visualization-5)",
  "var(--data-visualization-6)",
] as const;

const overviewFilterFields: readonly DashboardFilterKey[] = [
  "functionName",
  "orgUnit",
  "range",
  "location",
  "gender",
  "employmentType",
];

function toDashboardFilters(filters: OverviewQueryFilters): DashboardFilters {
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
  const searchParams = new URLSearchParams();
  const mappings = [
    ["functionName", filters.functionName],
    ["orgUnit", filters.orgUnit],
    ["range", filters.range],
    ["location", filters.location],
    ["gender", filters.gender],
    ["directOrIndirect", filters.employmentType],
  ] as const;
  mappings.forEach(([key, value]) => {
    if (value !== "All") searchParams.set(key, value);
  });
  return searchParams;
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...options,
  }).format(date);
}

function formatKpiValue(metric: KpiValue, format: KpiDefinition["format"]) {
  if (metric.value === null) return "N/A";

  if (format === "integer") {
    return metric.value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  const value = metric.value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });

  if (format === "percentage") return `${value}%`;
  if (format === "unit" && metric.unit) return `${value} ${metric.unit}`;
  return value;
}

function formatCompositionValue(item: OverviewChartDatum) {
  const headcount = item.value.toLocaleString("en-US");

  if (item.percentage === null) return headcount;

  const percentage = item.percentage.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });

  return `${headcount} (${percentage}%)`;
}

function mapChartData(
  data: OverviewChartDatum[],
  includePercentage = false,
): ChartDatum[] {
  return data.map((item) => ({
    label: item.label,
    value: item.value,
    displayValue: includePercentage
      ? formatCompositionValue(item)
      : item.value.toLocaleString("en-US"),
  }));
}

const levelDisplayOrder = [
  "SL4",
  "SL3",
  "SL2",
  "GROUP1",
  "GROUP2",
  "GROUP3",
  "GROUP4",
  "GROUP5",
  "GROUP6",
  "GROUP7",
];

function sortLevelData(data: ChartDatum[]) {
  return data.toSorted((left, right) => {
    const leftOrder = levelDisplayOrder.indexOf(left.label.replace(/\s/g, "").toUpperCase());
    const rightOrder = levelDisplayOrder.indexOf(right.label.replace(/\s/g, "").toUpperCase());

    return (leftOrder < 0 ? Number.MAX_SAFE_INTEGER : leftOrder)
      - (rightOrder < 0 ? Number.MAX_SAFE_INTEGER : rightOrder);
  });
}

function mapDonutData(data: OverviewChartDatum[]) {
  return data.map((item, index) => ({
    label: item.label,
    value: item.value,
    displayValue: item.percentage === null
      ? item.value.toLocaleString("en-US")
      : formatCompositionValue(item),
    color: chartColors[index % chartColors.length],
  }));
}

function ChartUnavailable() {
  return <p role="status">Data is not available for the selected reporting period.</p>;
}

export function OverviewDashboard({
  data,
  activeFilters,
  availableMonths,
  archivedMonths,
  isArchived,
}: {
  data: OverviewResponse;
  activeFilters: OverviewQueryFilters;
  availableMonths: OverviewAvailableMonths;
  archivedMonths: string[];
  isArchived: boolean;
}) {
  const router = useRouter();
  const appliedFilters = toDashboardFilters(activeFilters);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const [filterOptions, setFilterOptions] = useState(data.filterOptions);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const optionRequestId = useRef(0);
  const asOfLabel = formatDate(data.asOfDate, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hasReportingMonth = Boolean(activeFilters.reportingMonth || availableMonths.currentMonth);
  const comparisonLabel = hasReportingMonth ? `As of ${asOfLabel}` : "Current dataset";
  const periodDateLabel = hasReportingMonth ? asOfLabel : "Reporting month not set";
  const kpis: KpiMetric[] = kpiDefinitions.map((definition) => ({
    id: definition.id,
    title: definition.title,
    value: formatKpiValue(data.kpis[definition.key], definition.format),
    comparisonLabel: activeFilters.reportingMonth
      && (definition.key === "maternity" || definition.key === "sabbatical" || definition.key === "crl")
      ? "Current status"
      : comparisonLabel,
    icon: definition.icon,
    iconColor: definition.iconColor,
  }));
  const psGroupData = sortLevelData(mapChartData(data.charts.headcountByPsGroup.data, true));
  const genderData = mapDonutData(data.charts.genderDistribution.data);
  const functionData = mapChartData(data.charts.headcountByFunction.data, true);
  const locationData = mapChartData(data.charts.headcountByLocation.data, true);
  const ageData = mapChartData(data.charts.ageProfile.data);
  const tenureData = mapChartData(data.charts.tenureProfile.data);
  const movementData = mapChartData(data.charts.workforceMovement.data);
  const totalLabel = data.kpis.totalHeadcount.value === null
    ? "N/A"
    : data.kpis.totalHeadcount.value.toLocaleString("en-US");
  const periodOptions = [
    {
      value: "",
      label: availableMonths.currentMonth
        ? `Current (${availableMonths.currentMonth.slice(5)}/${availableMonths.currentMonth.slice(0, 4)})`
        : "Current",
      disabled: !availableMonths.currentMonth,
    },
    ...availableMonths.detailedMonths.map((month) => {
      const [year, monthNumber] = month.split("-");
      return { value: month, label: `${monthNumber}/${year}` };
    }),
    ...archivedMonths.map((month) => {
      const [year, monthNumber] = month.split("-");
      return { value: month, label: `${monthNumber}/${year} (Archived)` };
    }),
  ];

  const preserveReportingMonth = (searchParams: URLSearchParams) => {
    if (activeFilters.reportingMonth) {
      searchParams.set("reportingMonth", activeFilters.reportingMonth);
    }
    return searchParams;
  };

  const applyFilters = (filters: DashboardFilters) => {
    const searchParams = preserveReportingMonth(toSearchParams(filters));
    setIsFiltering(true);
    startTransition(() => {
      router.push(searchParams.size > 0 ? `/?${searchParams.toString()}` : "/");
    });
  };

  const refreshFilterOptions = async (filters: DashboardFilters) => {
    const requestId = ++optionRequestId.current;
    setIsLoadingOptions(true);
    try {
      const searchParams = preserveReportingMonth(toSearchParams(filters));
      const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
      const response = await fetch(`/api/overview/filter-options${query}`);
      if (!response.ok) return;
      const nextOptions = (await response.json()) as OverviewFilterOptions;
      if (requestId === optionRequestId.current) setFilterOptions(nextOptions);
    } catch {
      // Keep the current options; Apply still uses server-side validation.
    } finally {
      if (requestId === optionRequestId.current) setIsLoadingOptions(false);
    }
  };

  return (
    <main className="overview-page">
      <OverviewFilters
        value={draftFilters}
        activeValue={appliedFilters}
        period={activeFilters.reportingMonth ?? ""}
        periodOptions={periodOptions}
        fields={overviewFilterFields}
        filtersDisabled={isArchived}
        options={{
          functionName: filterOptions.functionName,
          orgUnit: filterOptions.orgUnit,
          range: filterOptions.range,
          location: filterOptions.location,
          gender: filterOptions.gender,
          employmentType: filterOptions.directOrIndirect,
        }}
        onChange={(filters) => {
          setDraftFilters(filters);
          void refreshFilterOptions(filters);
        }}
        onPeriodChange={(reportingMonth) => {
          const searchParams = archivedMonths.includes(reportingMonth)
            ? new URLSearchParams()
            : toSearchParams(appliedFilters);
          if (reportingMonth) searchParams.set("reportingMonth", reportingMonth);
          startTransition(() => {
            router.push(searchParams.size > 0 ? `/?${searchParams.toString()}` : "/");
          });
        }}
        onApply={() => applyFilters(draftFilters)}
        onClear={() => {
          setDraftFilters(emptyDashboardFilters);
          applyFilters(emptyDashboardFilters);
        }}
      />
      {isLoadingOptions && <p className="overview-page__filtering" role="status">Updating filter choices...</p>}
      {isFiltering && <p className="overview-page__filtering" role="status">Updating dashboard...</p>}
      <section className="kpi-section" aria-labelledby="workforce-summary-title">
        <div className="kpi-section__header">
          <div>
            <h1 id="workforce-summary-title" className="kpi-section__title">
              Workforce summary
            </h1>
            <p className="kpi-section__description">Current calculated workforce indicators</p>
          </div>
          <span className="kpi-section__period">{periodDateLabel}</span>
        </div>

        <KpiGrid>
          {kpis.map((kpi) => <KpiCard key={kpi.id} metric={kpi} />)}
        </KpiGrid>
      </section>

      <section className="dashboard-section" aria-labelledby="composition-title">
        <div className="dashboard-section__heading">
          <h2 id="composition-title">Workforce composition</h2>
          <p>Distribution of employees across organizational dimensions</p>
        </div>
        <div className="chart-grid chart-grid--composition">
          <ChartCard title="Headcount by function" description="Employees across business functions">
            {functionData.length > 0 ? <HorizontalBarChart data={functionData} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Gender distribution" description="Share of total workforce">
            {genderData.length > 0 ? <DonutChart data={genderData} total={totalLabel} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Headcount by Level" description="Employees across levels" className="chart-card--grade-funnel">
            {psGroupData.length > 0 ? <JoinedFunnelChart data={psGroupData} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Headcount by location" description="Employees across major sites">
            {locationData.length > 0 ? <IndiaLocationMap data={locationData} /> : <ChartUnavailable />}
          </ChartCard>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="profile-title">
        <div className="dashboard-section__heading">
          <h2 id="profile-title">Workforce profile and movement</h2>
          <p>Age, tenure, retirement exposure, and current-period workforce movement</p>
        </div>
        <div className="chart-grid chart-grid--profiles">
          <ChartCard title="Age Profile" description="Headcount by age range">
            {ageData.length > 0 ? <VerticalBarChart data={ageData} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Tenure Profile" description="Headcount by completed service">
            {tenureData.length > 0 ? <VerticalBarChart data={tenureData} tone="turquoise" /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Workforce Status" description="Current workforce by employee group">
            {movementData.length > 0 ? <MovementChart data={movementData} period={asOfLabel} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Retirement Analysis" description="Employees reaching retirement eligibility">
            {data.charts.retirementRisk.length > 0
              ? <RetirementRiskTable rows={data.charts.retirementRisk} />
              : <ChartUnavailable />}
          </ChartCard>
        </div>
      </section>
    </main>
  );
}