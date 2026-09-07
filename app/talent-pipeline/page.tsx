"use client";

import { useState } from "react";
import {
  emptyDashboardFilters,
  OverviewFilters,
  type DashboardFilters,
} from "../components/filters/OverviewFilters";
import { KpiCard, type KpiMetric } from "../components/kpi/KpiCard";
import { KpiGrid } from "../components/kpi/KpiGrid";
import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
} from "../components/charts/OverviewCharts";
import "./talent-pipeline.css";

const talentPoolDistribution = [
  { label: "TP1", value: 212 },
  { label: "TP2", value: 148 },
  { label: "TP3", value: 78 },
  { label: "TP4", value: 28 },
  { label: "TP5", value: 16 },
];

const activePassiveDistribution = [
  { label: "Active", value: 352, displayValue: "352 (73.0%)", color: "var(--data-visualization-3)" },
  { label: "Passive", value: 130, displayValue: "130 (27.0%)", color: "var(--data-visualization-5)" },
];

const nominationStatusDistribution = [
  { label: "Green", value: 259, displayValue: "259 (53.7%)", color: "var(--signal-success-pure__enabled__default__front)" },
  { label: "Amber", value: 134, displayValue: "134 (27.8%)", color: "var(--signal-warning-pure__enabled__default__front)" },
  { label: "Red", value: 89, displayValue: "89 (18.5%)", color: "var(--signal-error-pure__enabled__default__front)" },
];

const developmentPoolDistribution = [
  { label: "Female talent", value: 268, displayValue: "268 (55.6%)", color: "var(--data-visualization-4)" },
  { label: "Key to retain", value: 72, displayValue: "72 (14.9%)", color: "var(--data-visualization-1)" },
  { label: "Future talent", value: 94, displayValue: "94 (19.5%)", color: "var(--data-visualization-3)" },
  { label: "Change wanted", value: 48, displayValue: "48 (10.0%)", color: "var(--data-visualization-5)" },
];

const talentGenderDistribution = [
  { label: "Male", value: 374, displayValue: "374 (77.6%)", color: "var(--data-visualization-1)" },
  { label: "Female", value: 108, displayValue: "108 (22.4%)", color: "var(--data-visualization-4)" },
];

const talentRangeDistribution = [
  { label: "SL1", value: 25 },
  { label: "SL2", value: 12 },
  { label: "G1", value: 20 },
  { label: "G2", value: 92 },
  { label: "G3", value: 168 },
  { label: "G4", value: 96 },
  { label: "G5", value: 34 },
  { label: "G6", value: 12 },
];

const talentPipelineKpis: KpiMetric[] = [
  {
    id: "total-talent-pool",
    title: "Total talent pool",
    value: "482",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+3.1%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "blue",
  },
  {
    id: "active-talent-pool",
    title: "Active talent pool",
    value: "352",
    comparisonLabel: "73.0% of total",
    trendValue: "+2.6%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "green",
  },
  {
    id: "passive-talent-pool",
    title: "Passive talent pool members",
    value: "130",
    comparisonLabel: "27.0% of total",
    trendValue: "+5.7%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "orange",
  },
  {
    id: "development-pool",
    title: "Development pool",
    value: "482",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+1.9%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-chart-line",
    iconColor: "purple",
  },
  {
    id: "female-talent",
    title: "Female talent",
    value: "268",
    comparisonLabel: "55.6% of development pool",
    trendValue: "+1.3%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "red",
  },
  {
    id: "key-to-retain",
    title: "Key to retain",
    value: "72",
    comparisonLabel: "15.0% of development pool",
    icon: "boschicon-bosch-ic-user",
    iconColor: "orange",
  },
  {
    id: "future-talent",
    title: "Future talent",
    value: "94",
    comparisonLabel: "19.5% of development pool",
    icon: "boschicon-bosch-ic-chart-line",
    iconColor: "green",
  },
  {
    id: "change-wanted",
    title: "Change wanted",
    value: "48",
    comparisonLabel: "10.0% of development pool",
    icon: "boschicon-bosch-ic-refresh",
    iconColor: "blue",
  },
  {
    id: "talent-pool-expiring",
    title: "Talent pool expiring soon",
    value: "",
    comparisonLabel: "",
    breakdown: [
      { label: "≤ 6 months", value: "28" },
      { label: "≤ 12 months", value: "61" },
    ],
    icon: "boschicon-bosch-ic-calendar",
    iconColor: "blue",
  },
];

export default function TalentPipelinePage() {
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
      <section className="kpi-section" aria-labelledby="talent-pipeline-summary-title">
        <div className="kpi-section__header">
          <div>
            <h1 id="talent-pipeline-summary-title" className="kpi-section__title">
              Talent pipeline summary
            </h1>
            <p className="kpi-section__description">
              Talent pool composition, nomination status, and upcoming expirations
            </p>
          </div>
        </div>
        <KpiGrid>
          {talentPipelineKpis.map((kpi) => (
            <KpiCard key={kpi.id} metric={kpi} />
          ))}
        </KpiGrid>
      </section>

      <section className="dashboard-section" aria-labelledby="talent-distribution-title">
        <div className="dashboard-section__heading">
          <h2 id="talent-distribution-title">Talent pool distribution</h2>
          <p>Talent pool level, activity, nomination, gender, and range composition</p>
        </div>
        <div className="chart-grid chart-grid--composition">
          <ChartCard title="Talent pool distribution" description="Members by talent pool level">
            <VerticalBarChart data={talentPoolDistribution} />
          </ChartCard>
          <ChartCard title="Active vs passive" description="Current status of talent pool members">
            <DonutChart data={activePassiveDistribution} total="482" />
          </ChartCard>
          <ChartCard title="Nomination status (RAG)" description="Nomination health across the talent pool">
            <DonutChart data={nominationStatusDistribution} total="482" />
          </ChartCard>
          <ChartCard title="Development pool distribution" description="Members across development pool categories">
            <DonutChart data={developmentPoolDistribution} total="482" />
          </ChartCard>
          <ChartCard title="Gender and range distribution" description="Talent pool composition by gender and range">
            <div className="talent-demographics">
              <div className="talent-demographics__group">
                <h3>By gender</h3>
                <DonutChart data={talentGenderDistribution} total="482" />
              </div>
              <div className="talent-demographics__group">
                <h3>By range</h3>
                <HorizontalBarChart data={talentRangeDistribution} />
              </div>
            </div>
          </ChartCard>
        </div>
      </section>
    </main>
  );
}
