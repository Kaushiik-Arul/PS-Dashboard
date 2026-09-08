"use client";

import { useState } from "react";
import { emptyDashboardFilters,OverviewFilters,type DashboardFilters } from "../components/filters/OverviewFilters";
import { KpiCard, KpiMetric } from "../components/kpi/KpiCard";
import { KpiGrid } from "../components/kpi/KpiGrid";
import { ChartCard, DonutChart, VerticalBarChart } from "../components/charts/OverviewCharts";

const positionsbyCriticality = [
  { label: "High", value: 46, displayValue: "46 (47.9%)", color: "var(--signal-success-pure__enabled__default__front)" },
  { label: "Medium", value: 34, displayValue: "34 (35.4%)", color: "var(--signal-warning-pure__enabled__default__front)" },
  { label: "Low", value: 18, displayValue: "18 (18.8%)", color: "var(--signal-error-pure__enabled__default__front)" },
];

const incumbentChangeExpected = [
  { label: "2027", value: 8 },
  { label: "2028", value: 12 },
  { label: "2029", value: 10 },
  { label: "2030+", value: 66 },
];

const SuccessionPlanningKpis: KpiMetric[] = [
  {
      id: "total-position",
    title: "Total Position",
    value: "96",
    comparisonLabel: "vs Aug 2026",
    trendValue: "100%",
    trendDirection: "neutral",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "blue",
  },
  {
      id: "ready-now",
    title: "Ready now",
    value: "16",
    comparisonLabel: "vs Aug 2026",
    trendValue: "16.7%",
    trendDirection: "neutral",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "red",
  },
  {
      id: "ready-1to2-years",
    title: "Ready in 1 to 2 years",
    value: "24",
    comparisonLabel: "vs Aug 2026",
    trendValue: "25.0%",
    trendDirection: "neutral",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "orange",
  },
  {
      id: "ready-3to4-years",
    title: "Ready in 3 to 4 years",
    value: "31",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+32.1%",
    trendDirection: "neutral",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "red",
  },{
      id: "ready-successors",
    title: "Position w/o Ready Successors",
    value: "23",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+23.1%",
    trendDirection: "neutral",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "green",
  }
];


export default function SuccessionPlanningPage() {
    const [draftFilters, setDraftFilters] = useState<DashboardFilters>({
    ...emptyDashboardFilters,
  });
  const [activeFilters, setActiveFilters] = useState<DashboardFilters>({
    ...emptyDashboardFilters,
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
        onChange={setDraftFilters}
        onApply={() => setActiveFilters({ ...draftFilters })}
        onClear={clearFilters}
      />


      <section className="kpi-section" aria-labelledby="succession-pipeline-summary-title">
        <div className="kpi-section__header">
          <div>
            <h1 id="succession-pipeline-summary-title" className="kpi-section__title">
              Succession pipeline summary
            </h1>
            <p className="kpi-section__description">
              Position coverage, succession readiness, development status and cross-BU opportunities
            </p>
          </div>
        </div>
        <KpiGrid>
          {SuccessionPlanningKpis.map((kpi) => (
            <KpiCard key={kpi.id} metric={kpi} />
           ))}
        </KpiGrid>
      </section>
      <section className="dashboard-section" aria-labelledby="Succession-planning-distribution-title">
        <div className="dashboard-section__heading">
          <h2 id="Succession-planning-distribution-title">Succession Planning Distribution</h2>
          <p>Succession Planning Distribution by various metrics</p>
        </div>
        <div className="chart-grid chart-grid--composition">
          <ChartCard title="Active vs passive" description="Current status of position by criticality">
            <DonutChart data={positionsbyCriticality} total="98" />
          </ChartCard>
          <ChartCard title="Incumbent Change Expected" description="Expected changes in incumbents by year">
            <VerticalBarChart data={incumbentChangeExpected} />
          </ChartCard>          
        </div>
      </section>
    </main>
  );
}