"use client";

import { useState } from "react";
import { KpiCard } from "./components/kpi/KpiCard";
import { KpiGrid } from "./components/kpi/KpiGrid";
import type { KpiMetric } from "./components/kpi/KpiCard";
import {
  emptyDashboardFilters,
  OverviewFilters,
  type DashboardFilters,
} from "./components/filters/OverviewFilters";
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  MovementChart,
  RetirementRiskTable,
  VerticalBarChart,
} from "./components/charts/OverviewCharts";

const kpis: KpiMetric[] = [
  {
    id: "total-hc",
    title: "Total HC",
    value: "13,378",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+0.9%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "blue",
  },
  {
    id: "direct-hc",
    title: "Direct HC",
    value: "9,458",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+1.2%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "green",
  },
  {
    id: "indirect-hc",
    title: "Indirect HC",
    value: "3,920",
    comparisonLabel: "vs Aug 2026",
    trendValue: "-0.3%",
    trendDirection: "down",
    trendTone: "adverse",
    icon: "boschicon-bosch-ic-user",
    iconColor: "orange",
  },
  {
    id: "female-pct",
    title: "Female %",
    value: "22.6%",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+0.6pp",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "red",
  },
  {
    id: "avg-age",
    title: "Avg age",
    value: "39.2",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+0.2",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-calendar",
    iconColor: "purple",
  },
  {
    id: "avg-tenure",
    title: "Avg tenure",
    value: "11.4 Yrs",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+0.1",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-briefcase",
    iconColor: "blue",
  },
  {
    id: "ret-3yrs",
    title: "RET < 3 yrs",
    value: "46",
    comparisonLabel: "vs Aug 2026",
    trendValue: "-2",
    trendDirection: "down",
    trendTone: "adverse",
    icon: "boschicon-bosch-ic-clock",
    iconColor: "orange",
  },
  {
    id: "attrition-ytd",
    title: "Attrition YTD",
    value: "3.2%",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+0.4pp",
    trendDirection: "up",
    trendTone: "adverse",
    icon: "boschicon-bosch-ic-chart-line",
    iconColor: "red",
  },
  {
    id: "maternity",
    title: "Maternity",
    value: "128",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+6",
    trendDirection: "up",
    trendTone: "neutral",
    icon: "boschicon-bosch-ic-user",
    iconColor: "purple",
  },
  {
    id: "sabbatical",
    title: "Sabbatical",
    value: "42",
    comparisonLabel: "vs Aug 2026",
    trendValue: "-3",
    trendDirection: "down",
    trendTone: "neutral",
    icon: "boschicon-bosch-ic-calendar",
    iconColor: "green",
  },
  {
    id: "crl",
    title: "CRL",
    value: "76",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+4",
    trendDirection: "up",
    trendTone: "neutral",
    icon: "boschicon-bosch-ic-clock",
    iconColor: "orange",
  },
];

const headcountByRange = [
  { label: "SL2", value: 12 },
  { label: "SL1", value: 48 },
  { label: "Group 1", value: 120 },
  { label: "Group 2", value: 385 },
  { label: "Group 3", value: 5212 },
  { label: "Group 4", value: 2310 },
  { label: "Group 5", value: 962 },
  { label: "Group 6", value: 329 },
];

const headcountByFunction = [
  { label: "Research & development", value: 4813 },
  { label: "Manufacturing", value: 3205 },
  { label: "Logistics", value: 1103 },
  { label: "Quality", value: 820 },
  { label: "Sales & marketing", value: 561 },
  { label: "HR", value: 180 },
  { label: "Others", value: 696 },
];

const genderDistribution = [
  { label: "Male", value: 77.4, displayValue: "77.4%", color: "var(--data-visualization-3)" },
  { label: "Female", value: 22.6, displayValue: "22.6%", color: "var(--data-visualization-4)" },
];

const locationDistribution = [
  { label: "Bangalore", value: 7200, displayValue: "7,200", color: "var(--data-visualization-2)" },
  { label: "Bidadi", value: 2800, displayValue: "2,800", color: "var(--data-visualization-1)" },
  { label: "Nashik", value: 1500, displayValue: "1,500", color: "color-mix(in srgb, var(--data-visualization-2) 78%, var(--background))" },
  { label: "Jaipur", value: 1100, displayValue: "1,100", color: "color-mix(in srgb, var(--data-visualization-1) 68%, var(--background))" },
  { label: "Pune", value: 778, displayValue: "778", color: "color-mix(in srgb, var(--data-visualization-1) 46%, var(--background))" },
];

const ageProfile = [
  { label: "< 30", value: 1362 },
  { label: "31–35", value: 2274 },
  { label: "36–40", value: 3512 },
  { label: "41–45", value: 2888 },
  { label: "46–50", value: 2076 },
  { label: "51–55", value: 1002 },
  { label: "56+", value: 264 },
];

const tenureProfile = [
  { label: "0–2 yrs", value: 1071 },
  { label: "3–5 yrs", value: 1876 },
  { label: "6–10 yrs", value: 2946 },
  { label: "11–20 yrs", value: 5484 },
  { label: "20+ yrs", value: 2001 },
];

const retirementRisk = [
  { functionName: "Manufacturing", oneYear: 2, threeYears: 18, fiveYears: 32 },
  { functionName: "R&D", oneYear: 1, threeYears: 5, fiveYears: 14 },
  { functionName: "Logistics", oneYear: 1, threeYears: 9, fiveYears: 16 },
  { functionName: "Quality", oneYear: 0, threeYears: 7, fiveYears: 11 },
  { functionName: "Sales & marketing", oneYear: 0, threeYears: 4, fiveYears: 6 },
  { functionName: "HR", oneYear: 0, threeYears: 1, fiveYears: 2 },
  { functionName: "Others", oneYear: 4, threeYears: 2, fiveYears: 8 },
];

const periodSnapshots = [
  { value: "09/26", title: "September 2026", comparison: "August 2026", scale: 1, movement: { month: "Sep", inbound: 112, outbound: 61, active: 165 } },
  { value: "08/26", title: "August 2026", comparison: "July 2026", scale: 0.991, movement: { month: "Aug", inbound: 96, outbound: 58, active: 149 } },
  { value: "07/26", title: "July 2026", comparison: "June 2026", scale: 0.984, movement: { month: "Jul", inbound: 104, outbound: 64, active: 158 } },
  { value: "06/26", title: "June 2026", comparison: "May 2026", scale: 0.978, movement: { month: "Jun", inbound: 89, outbound: 55, active: 142 } },
  { value: "05/26", title: "May 2026", comparison: "April 2026", scale: 0.972, movement: { month: "May", inbound: 92, outbound: 60, active: 146 } },
];

const baselineTotal = 13378;

const fixedFilterShares: Partial<Record<keyof DashboardFilters, Record<string, number>>> = {
  businessUnit: { "Mobility Solutions": 0.52, "Industrial Technology": 0.28, "Consumer Goods": 0.2 },
  orgUnit: { Engineering: 0.38, Operations: 0.34, Commercial: 0.16, Corporate: 0.12 },
  employmentType: { Direct: 9458 / baselineTotal, Indirect: 3920 / baselineTotal },
  hrbp: { "John Doe": 0.42, "Priya Sharma": 0.33, "Michael Chen": 0.25 },
};

function shareFromData(value: string, data: Array<{ label: string; value: number }>) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (data.find((item) => item.label === value)?.value ?? 0) / total;
}

function getFilteredScale(filters: DashboardFilters) {
  return (Object.entries(filters) as Array<[keyof DashboardFilters, string]>).reduce((scale, [key, value]) => {
    if (value === "All") return scale;
    if (key === "functionName") return scale * shareFromData(value, headcountByFunction);
    if (key === "range") return scale * shareFromData(value, headcountByRange);
    if (key === "location") return scale * shareFromData(value, locationDistribution);
    if (key === "gender") return scale * shareFromData(value, genderDistribution);
    return scale * (fixedFilterShares[key]?.[value] ?? 1);
  }, 1);
}

function normalizeData<T extends { label: string; value: number }>(data: T[], selection: string, total: number) {
  const visibleData = selection === "All" ? data : data.filter((item) => item.label === selection);
  const visibleTotal = visibleData.reduce((sum, item) => sum + item.value, 0);

  return visibleData.map((item) => ({
    ...item,
    value: visibleTotal > 0 ? Math.round((item.value / visibleTotal) * total) : 0,
    displayValue: visibleTotal > 0 ? Math.round((item.value / visibleTotal) * total).toLocaleString() : "0",
  }));
}

function scaleProfile<T extends { value: number }>(data: T[], total: number) {
  const profileTotal = data.reduce((sum, item) => sum + item.value, 0);
  return data.map((item) => ({ ...item, value: Math.round((item.value / profileTotal) * total) }));
}

export default function OverviewPage() {
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>({ ...emptyDashboardFilters });
  const [activeFilters, setActiveFilters] = useState<DashboardFilters>({ ...emptyDashboardFilters });
  const [selectedPeriod, setSelectedPeriod] = useState("09/26");
  const currentPeriod = periodSnapshots.find((snapshot) => snapshot.value === selectedPeriod) ?? periodSnapshots[0];
  const filterScale = getFilteredScale(activeFilters);
  const filteredTotal = Math.round(baselineTotal * currentPeriod.scale * filterScale);
  const totalLabel = filteredTotal.toLocaleString();
  const filteredRanges = normalizeData(headcountByRange, activeFilters.range, filteredTotal);
  const filteredFunctions = normalizeData(headcountByFunction, activeFilters.functionName, filteredTotal);
  const filteredLocations = normalizeData(locationDistribution, activeFilters.location, filteredTotal);
  const filteredGender = activeFilters.gender === "All"
    ? genderDistribution
    : genderDistribution
        .filter((item) => item.label === activeFilters.gender)
        .map((item) => ({ ...item, value: 100, displayValue: "100%" }));
  const filteredAge = scaleProfile(ageProfile, filteredTotal);
  const filteredTenure = scaleProfile(tenureProfile, filteredTotal);
  const filteredRisk = retirementRisk.map((row) => ({
    ...row,
    oneYear: Math.round(row.oneYear * filteredTotal / baselineTotal),
    threeYears: Math.round(row.threeYears * filteredTotal / baselineTotal),
    fiveYears: Math.round(row.fiveYears * filteredTotal / baselineTotal),
  }));
  const filteredMovement = [{
    ...currentPeriod.movement,
    inbound: Math.round(currentPeriod.movement.inbound * filterScale),
    outbound: Math.round(currentPeriod.movement.outbound * filterScale),
    active: Math.round(currentPeriod.movement.active * filterScale),
  }];
  const filteredKpis = kpis.map((kpi) => {
    const metric = { ...kpi, comparisonLabel: `vs ${currentPeriod.comparison}` };
    if (kpi.id === "total-hc") return { ...metric, value: totalLabel };
    if (kpi.id === "direct-hc") {
      const value = activeFilters.employmentType === "Indirect" ? 0 : activeFilters.employmentType === "Direct" ? filteredTotal : Math.round(filteredTotal * 9458 / baselineTotal);
      return { ...metric, value: value.toLocaleString() };
    }
    if (kpi.id === "indirect-hc") {
      const value = activeFilters.employmentType === "Direct" ? 0 : activeFilters.employmentType === "Indirect" ? filteredTotal : Math.round(filteredTotal * 3920 / baselineTotal);
      return { ...metric, value: value.toLocaleString() };
    }
    if (kpi.id === "female-pct") {
      const value = activeFilters.gender === "Female" ? "100%" : activeFilters.gender === "Male" ? "0%" : "22.6%";
      return { ...metric, value };
    }
    if (["ret-3yrs", "maternity", "sabbatical", "crl"].includes(kpi.id)) {
      return { ...metric, value: Math.round(Number.parseInt(kpi.value, 10) * filteredTotal / baselineTotal).toLocaleString() };
    }
    return metric;
  });

  const clearFilters = () => {
    setDraftFilters({ ...emptyDashboardFilters });
    setActiveFilters({ ...emptyDashboardFilters });
  };

  return (
    <main className="overview-page">
      <OverviewFilters
        value={draftFilters}
        activeValue={activeFilters}
        period={selectedPeriod}
        periodOptions={periodSnapshots.map((snapshot) => snapshot.value)}
        onChange={setDraftFilters}
        onPeriodChange={setSelectedPeriod}
        onApply={() => setActiveFilters({ ...draftFilters })}
        onClear={clearFilters}
      />
      {filteredTotal === 0 ? (
        <section className="dashboard-state -primary" role="status">
          <i className="a-icon boschicon-bosch-ic-search" aria-hidden="true" />
          <h1>No matching workforce data</h1>
          <p>Clear one or more filters to see dashboard results.</p>
          <button className="a-button" type="button" onClick={clearFilters}>
            <span className="a-button__label">Clear filters</span>
          </button>
        </section>
      ) : (
        <>
      <section className="kpi-section" aria-labelledby="workforce-summary-title">
        <div className="kpi-section__header">
          <div>
            <h1 id="workforce-summary-title" className="kpi-section__title">
              Workforce summary
            </h1>
            <p className="kpi-section__description">
              Key workforce indicators compared with {currentPeriod.comparison}
            </p>
          </div>
          <span className="kpi-section__period">{currentPeriod.title}</span>
        </div>

        <KpiGrid>
          {filteredKpis.map((kpi) => (
            <KpiCard key={kpi.id} metric={kpi} />
          ))}
        </KpiGrid>
      </section>

      <section className="dashboard-section" aria-labelledby="composition-title">
        <div className="dashboard-section__heading">
          <h2 id="composition-title">Workforce composition</h2>
          <p>Distribution of employees across organizational dimensions</p>
        </div>
        <div className="chart-grid chart-grid--composition">
          <ChartCard title="Headcount by range" description="Employees by salary level and group">
            <HorizontalBarChart data={filteredRanges} />
          </ChartCard>
          <ChartCard title="Gender distribution" description="Share of total workforce">
            <DonutChart data={filteredGender} total={totalLabel} />
          </ChartCard>
          <ChartCard title="Headcount by function" description="Employees across business functions">
            <HorizontalBarChart data={filteredFunctions} />
          </ChartCard>
          <ChartCard title="Headcount by location" description="Employees across major sites">
            <DonutChart data={filteredLocations} total={totalLabel} />
          </ChartCard>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="profile-title">
        <div className="dashboard-section__heading">
          <h2 id="profile-title">Workforce profile and movement</h2>
          <p>Age, tenure, retirement exposure, and current-month workforce movement</p>
        </div>
        <div className="chart-grid chart-grid--profiles">
          <ChartCard title="Age profile" description="Headcount by age range">
            <VerticalBarChart data={filteredAge} />
          </ChartCard>
          <ChartCard title="Tenure profile" description="Headcount by completed service">
            <VerticalBarChart data={filteredTenure} tone="turquoise" />
          </ChartCard>
          <ChartCard title="Workforce movement" description={`Inbound, outbound, and active employees in ${currentPeriod.title}`}>
            <MovementChart data={filteredMovement} period={currentPeriod.title} />
          </ChartCard>
          <ChartCard title="Retirement risk" description="Employees reaching retirement eligibility" className="chart-card--wide">
            <RetirementRiskTable rows={filteredRisk} />
          </ChartCard>
        </div>
      </section>
        </>
      )}
    </main>
  );
}