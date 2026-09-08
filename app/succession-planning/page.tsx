"use client";

import { useState } from "react";
import { emptyDashboardFilters,OverviewFilters,type DashboardFilters } from "../components/filters/OverviewFilters";
import { KpiCard, KpiMetric } from "../components/kpi/KpiCard";
import { KpiGrid } from "../components/kpi/KpiGrid";

const SuccessionPlanningKpis: KpiMetric[] = [
  {
      id: "total-position",
    title: "Total Position",
    value: "96",
    comparisonLabel: "vs Aug 2026",
    trendValue: "100%",
    trendDirection: "up",
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
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "blue",
  },
  {
      id: "ready-1to2-years",
    title: "Ready in 1 to 2 years",
    value: "24",
    comparisonLabel: "vs Aug 2026",
    trendValue: "25.0%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "blue",
  },
  {
      id: "ready-3to4-years",
    title: "Ready in 3 to 4 years",
    value: "31",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+32.1%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "blue",
  },{
      id: "ready-successors",
    title: "Position w/o Ready Successors",
    value: "23",
    comparisonLabel: "vs Aug 2026",
    trendValue: "+23.1%",
    trendDirection: "up",
    trendTone: "favorable",
    icon: "boschicon-bosch-ic-user",
    iconColor: "blue",
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
    </main>
  );
}