"use client";

import { useState } from "react";
import { emptyDashboardFilters,OverviewFilters,type DashboardFilters } from "../components/filters/OverviewFilters";
import { KpiCard, KpiMetric } from "../components/kpi/KpiCard";
import { KpiGrid } from "../components/kpi/KpiGrid";
import { ChartCard, DonutChart, VerticalBarChart } from "../components/charts/OverviewCharts";
import { DataTable, type DataTableColumn } from "../components/data-table/DataTable";
import { redirect } from "next/navigation";
import { useAuth } from "@/src/auth/AuthProvider";
import { hasPermission } from "@/src/auth/permissions";

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

interface SuccessionPosition {
  status: "critical" | "attention" | "covered" | "neutral";
  area: string;
  jobId: string;
  position: string;
  criticality: string;
  incumbent: string;
  orgUnit: string;
  age: number;
  changeYear: string;
  successor: string;
  readiness: string;
  action: string;
}

const successionColumns: DataTableColumn<SuccessionPosition>[] = [
  {
    key: "status",
    label: "Status",
    group: "Position information",
    filterable: true,
    render: (value) => (
      <span className="data-table__status">
        <i className={`data-table__status-dot -${String(value)}`} aria-hidden="true" />
        <span className="data-table__badge">{String(value)}</span>
      </span>
    ),
  },
  { key: "area", label: "Area", group: "Position information", filterable: true },
  { key: "jobId", label: "Job ID", group: "Position information" },
  { key: "position", label: "Position name", group: "Position information" },
  {
    key: "criticality",
    label: "Criticality",
    group: "Position information",
    filterable: true,
    render: (value) => <span className="data-table__badge">{String(value)}</span>,
  },
  { key: "incumbent", label: "Incumbent", group: "Current incumbent" },
  { key: "orgUnit", label: "Org unit", group: "Current incumbent" },
  { key: "age", label: "Age", group: "Current incumbent" },
  { key: "changeYear", label: "Change year", group: "Current incumbent", filterable: true },
  { key: "successor", label: "Successor", group: "Successor 1" },
  { key: "readiness", label: "Readiness", group: "Successor 1", filterable: true },
  { key: "action", label: "Remarks / action", group: "Actions" },
];

const successionPositions: SuccessionPosition[] = [
  { status: "critical", area: "RP", jobId: "PSEN04454", position: "Product Management DC", criticality: "Critical", incumbent: "Narayanan S V", orgUnit: "PS-DC/PM-A", age: 53, changeYear: "2031", successor: "Lakshmi Krishnagowda", readiness: "Ready later", action: "Build market exposure" },
  { status: "attention", area: "RP", jobId: "PSENL01150", position: "Engineering Test Centre Lead", criticality: "Critical", incumbent: "Aravind Krishnan", orgUnit: "PS/ETC-IN", age: 53, changeYear: "2030", successor: "Arvind Karingannur", readiness: "Ready now", action: "Confirm transition plan" },
  { status: "covered", area: "RP", jobId: "PSENL5220", position: "Engineering Sensors", criticality: "Critical", incumbent: "Sandeep D", orgUnit: "PS-SW/ENG-IN", age: 44, changeYear: "2027", successor: "Buddhadeb B", readiness: "Ready in 1-2 yrs", action: "Discuss development plan" },
  { status: "neutral", area: "RP", jobId: "PSENL0926", position: "Engineering Advanced Technology Lead", criticality: "Niche", incumbent: "Rajsekhar N B", orgUnit: "PS/EAT-IN", age: 58, changeYear: "2028", successor: "Pranav Upadhya", readiness: "Ready in 2-3 yrs", action: "Monitor readiness" },
  { status: "covered", area: "RP", jobId: "PSENCS211", position: "Regional Product Area Engineering", criticality: "Critical", incumbent: "Nagash A", orgUnit: "PS-GPF/ENG-IN", age: 51, changeYear: "2030", successor: "Balachandra D", readiness: "Ready now", action: "Start shadow assignment" },
  { status: "neutral", area: "RP", jobId: "PSENCS219", position: "Regional Product Development", criticality: "Niche", incumbent: "Prashanth G", orgUnit: "PS-GR/ENG-IN", age: 51, changeYear: "2030", successor: "Avinash L", readiness: "Ready and active", action: "No action required" },
  { status: "neutral", area: "RP", jobId: "PSENCS184", position: "Quality Management", criticality: "Niche", incumbent: "Puttaswamy L S", orgUnit: "PS-DC/QM-IN", age: 55, changeYear: "2031", successor: "-", readiness: "Not identified", action: "Identify candidates" },
  { status: "attention", area: "RP", jobId: "PSENMG222", position: "Product Management SB", criticality: "Critical", incumbent: "Pavan Kumar", orgUnit: "PS-GR/PM-IN", age: 49, changeYear: "2027", successor: "Varun Rao", readiness: "Ready in 1-2 yrs", action: "Strengthen leadership scope" },
  { status: "attention", area: "RP", jobId: "PSENLM196", position: "Engineering Powertrain Testing", criticality: "Critical", incumbent: "Aravind K", orgUnit: "PS/ETW-IN", age: 52, changeYear: "2030", successor: "Praveen B N", readiness: "Ready in 2-3 yrs", action: "Add cross-BU assignment" },
  { status: "covered", area: "BD", jobId: "PSENBD102", position: "Business Development Lead", criticality: "Critical", incumbent: "Meera Joshi", orgUnit: "PS/BD-IN", age: 47, changeYear: "2029", successor: "Rahul Menon", readiness: "Ready now", action: "Plan phased handover" },
  { status: "critical", area: "SC", jobId: "PSENSC087", position: "Supply Chain Director", criticality: "Critical", incumbent: "Vikram Shah", orgUnit: "PS/SC-IN", age: 59, changeYear: "2027", successor: "-", readiness: "Not identified", action: "Open successor search" },
  { status: "covered", area: "FN", jobId: "PSENFN063", position: "Finance Operations Lead", criticality: "Niche", incumbent: "Anita Rao", orgUnit: "PS/FN-IN", age: 46, changeYear: "2032", successor: "Kiran Patel", readiness: "Ready in 1-2 yrs", action: "Continue rotation plan" },
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
  const { role } = useAuth();
  if (!role || !hasPermission(role, "successionPlanningPoint")) {
    redirect("/");
  }
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
          <ChartCard title="Active vs passive" description="Current status of position by criticality" onDownload={()=>console.log("Export Position")}>
            <DonutChart data={positionsbyCriticality} total="98" />
          </ChartCard>
          <ChartCard title="Incumbent Change Expected" description="Expected changes in incumbents by year">
            <VerticalBarChart data={incumbentChangeExpected} />
          </ChartCard>          
        </div>
      </section>
      <DataTable
        title="Succession plan - position level register"
        description="Position coverage, incumbent transitions, successor readiness, and actions"
        columns={successionColumns}
        rows={successionPositions}
        getRowKey={(row) => row.jobId}
        downloadFileName="succession-position-register"
      />
    </main>
  );
}