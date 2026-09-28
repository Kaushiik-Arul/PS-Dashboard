"use client";

import { useEffect, useState } from "react";
import {
  emptyDashboardFilters,
  OverviewFilters,
  type DashboardFilters,
} from "@/components/filters/OverviewFilters";

import { KpiCard, type KpiMetric } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";

import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
} from "@/components/charts/OverviewCharts";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/DataTable";

import "./talent-pipeline.css";
import { PoolRegisterTable } from "../hrbp-point/PoolRegisterTable";
import { getStatusTone } from "./status";

function renderStatusValue(value: unknown) {
  return (
    <span className={`data-table__badge -${getStatusTone(value)}`}>
      {String(value)}
    </span>
  );
}

/* =========================================================
   CHART DATA
========================================================= */

const talentPoolDistribution = [
  { label: "TP1", value: 212 },
  { label: "TP2", value: 148 },
  { label: "TP3", value: 78 },
  { label: "TP4", value: 28 },
  { label: "TP5", value: 16 },
];

const activePassiveDistribution = [
  {
    label: "Active",
    value: 352,
    displayValue: "352 (73.0%)",
    color: "var(--data-visualization-3)",
  },
  {
    label: "Passive",
    value: 130,
    displayValue: "130 (27.0%)",
    color: "var(--data-visualization-5)",
  },
];

const nominationStatusDistribution = [
  {
    label: "Green",
    value: 259,
    displayValue: "259 (53.7%)",
    color: "var(--signal-success-pure__enabled__default__front)",
  },
  {
    label: "Amber",
    value: 134,
    displayValue: "134 (27.8%)",
    color: "var(--signal-warning-pure__enabled__default__front)",
  },
  {
    label: "Red",
    value: 89,
    displayValue: "89 (18.5%)",
    color: "var(--signal-error-pure__enabled__default__front)",
  },
];

const developmentPoolDistribution = [
  {
    label: "Female talent",
    value: 268,
    displayValue: "268 (55.6%)",
    color: "var(--data-visualization-4)",
  },
  {
    label: "Key to retain",
    value: 72,
    displayValue: "72 (14.9%)",
    color: "var(--data-visualization-1)",
  },
  {
    label: "Future talent",
    value: 94,
    displayValue: "94 (19.5%)",
    color: "var(--data-visualization-3)",
  },
  {
    label: "Change wanted",
    value: 48,
    displayValue: "48 (10.0%)",
    color: "var(--data-visualization-5)",
  },
];

const talentGenderDistribution = [
  {
    label: "Male",
    value: 374,
    displayValue: "374 (77.6%)",
    color: "var(--data-visualization-1)",
  },
  {
    label: "Female",
    value: 108,
    displayValue: "108 (22.4%)",
    color: "var(--data-visualization-4)",
  },
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

/* =========================================================
   TABLE 1
   STEP AVAILABLE TALENT
========================================================= */

interface StepAvailableTalent {
  personnelNo: string;
  employeeName: string;
  talentPool: string;
  developmentPool: string;
  functionName: string;
  orgUnit: string;
  location: string;
  stepAvailability: string;
  preferredFunction: string;
  preferredLocation: string;
  availableFrom: string;
}

const stepAvailableTalentColumns: DataTableColumn<StepAvailableTalent>[] = [
  {
    key: "personnelNo",
    label: "Pers.No.",
    group: "Employee",
  },
  {
    key: "employeeName",
    label: "Employee Name",
    group: "Employee",
  },

  {
    key: "talentPool",
    label: "Talent Pool",
    group: "Talent",
    filterable: true,
  },
  {
    key: "developmentPool",
    label: "Dev. Pool",
    group: "Talent",
    filterable: true,
  },

  {
    key: "functionName",
    label: "Function",
    group: "Current Position",
    filterable: true,
  },
  {
    key: "orgUnit",
    label: "Org Unit",
    group: "Current Position",
    filterable: true,
  },
  {
    key: "location",
    label: "Location",
    group: "Current Position",
    filterable: true,
  },

  {
    key: "stepAvailability",
    label: "STEP Availability",
    group: "STEP Preference",
    filterable: true,
    render: renderStatusValue,
  },

  {
    key: "preferredFunction",
    label: "Preferred Function",
    group: "STEP Preference",
  },
  {
    key: "preferredLocation",
    label: "Preferred Location",
    group: "STEP Preference",
  },
  {
    key: "availableFrom",
    label: "Avail. From",
    group: "STEP Preference",
  }
];

const stepAvailableTalent: StepAvailableTalent[] = [
  {
    personnelNo: "3005409",
    employeeName: "Sujith Sugathan",
    talentPool: "TP1",
    developmentPool: "Future Talent",
    functionName: "R&D",
    orgUnit: "PS-DC/ENG-IN",
    location: "Bangalore",
    stepAvailability: "Available",
    preferredFunction: "Engineering / Project Mgmt",
    preferredLocation: "Bangalore / Germany",
    availableFrom: "01-Jan-2027",
  },
  {
    personnelNo: "31195420",
    employeeName: "Mohan Murugan R",
    talentPool: "TP1",
    developmentPool: "-",
    functionName: "R&D",
    orgUnit: "PS-CC/RW-IN",
    location: "Bangalore",
    stepAvailability: "Under Discussion",
    preferredFunction: "R&D",
    preferredLocation: "Europe",
    availableFrom: "01-Apr-2027",
    // preferredNeed: "6-10 Months",
  },
  {
    personnelNo: "3079124",
    employeeName: "Vijaya Mohan N S",
    talentPool: "TP1",
    developmentPool: "Key to Retain",
    functionName: "General Mgmt",
    orgUnit: "PS/RP-IN",
    location: "Bangalore",
    stepAvailability: "Available",
    preferredFunction: "General Mgmt",
    preferredLocation: "Europe / India",
    availableFrom: "01-Jun-2026",
    // preferredNeed: "12-24 Months",
  },
  {
    personnelNo: "3063279",
    employeeName: "Amit Singhal",
    talentPool: "TP1",
    developmentPool: "Future Talent",
    functionName: "Sales",
    orgUnit: "PS/CA-IN",
    location: "Bangalore",
    stepAvailability: "Planned",
    preferredFunction: "Sales",
    preferredLocation: "Europe",
    availableFrom: "01-Sep-2027",
    // preferredNeed: "12 Months",
  },
  {
    personnelNo: "3075806",
    employeeName: "Ravindra",
    talentPool: "TP1",
    developmentPool: "Key to Retain",
    functionName: "Logistics",
    orgUnit: "PS/LOG-IN",
    location: "Bangalore",
    stepAvailability: "Not Available",
    preferredFunction: "-",
    preferredLocation: "-",
    availableFrom: "-",
    // preferredNeed: "-",
  },
];

/* =========================================================
   TABLE 2
   OPEN STEP POSITIONS
========================================================= */

interface ActiveStepRow {
  id: string; slNo: string | null; year: number; persNo: string; employeeName: string;
  grp: string | null; initiatedBy: string | null; exchangedWith: string | null;
  stepFrom: string; stepTo: string | null; entityFrom: string | null; entityTo: string | null;
  gbFrom: string | null; gbTo: string | null; functionFrom: string | null; functionTo: string | null;
  deptFrom: string | null; deptTo: string | null; locationFrom: string | null; locationTo: string | null;
}

const activeStepColumns: DataTableColumn<ActiveStepRow>[] = [
  { key: "year", label: "Year", group: "Employee", filterable: true },
  { key: "persNo", label: "E No", group: "Employee", filterable: true },
  { key: "employeeName", label: "E Name", group: "Employee", filterable: true },
  { key: "grp", label: "Group", group: "Employee", filterable: true },
  { key: "initiatedBy", label: "Initiated by (HRBP)", group: "Exchange", filterable: true },
  { key: "exchangedWith", label: "Exchanged with", group: "Exchange", filterable: true },
  { key: "stepFrom", label: "STEP Period From", group: "STEP Period", filterable: true },
  { key: "stepTo", label: "STEP Period To", group: "STEP Period", filterable: true },
  { key: "entityFrom", label: "Entity From", group: "Entity", filterable: true },
  { key: "entityTo", label: "Entity To", group: "Entity", filterable: true },
  { key: "gbFrom", label: "GB From", group: "GB", filterable: true },
  { key: "gbTo", label: "GB To", group: "GB", filterable: true },
  { key: "functionFrom", label: "Function From", group: "Function", filterable: true },
  { key: "functionTo", label: "Function To", group: "Function", filterable: true },
  { key: "deptFrom", label: "Dept From", group: "Dept", filterable: true },
  { key: "deptTo", label: "Dept To", group: "Dept", filterable: true },
  { key: "locationFrom", label: "Location From", group: "Location", filterable: true },
  { key: "locationTo", label: "Location To", group: "Location", filterable: true },
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

/* =========================================================
   PAGE
========================================================= */

export function TalentPipelineDashboard() {
  const [activeStepRows, setActiveStepRows] = useState<ActiveStepRow[]>([]);
  const [activeStepError, setActiveStepError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/hrbp-point/active-step", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Active STEP could not be loaded.");
      return response.json() as Promise<ActiveStepRow[]>;
    }).then((rows) => setActiveStepRows(rows)).catch((error) => {
      if (!controller.signal.aborted) setActiveStepError(error instanceof Error ? error.message : "Active STEP could not be loaded.");
    });
    return () => controller.abort();
  }, []);

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

      {/* KPI SECTION */}

      <section
        className="kpi-section"
        aria-labelledby="talent-pipeline-summary-title"
      >
        <div className="kpi-section__header">
          <div>
            <h1
              id="talent-pipeline-summary-title"
              className="kpi-section__title"
            >
              Talent pipeline summary
            </h1>

            <p className="kpi-section__description">
              Talent pool composition, nomination status, and upcoming
              expirations
            </p>
          </div>
        </div>

        <KpiGrid>
          {talentPipelineKpis.map((kpi) => (
            <KpiCard key={kpi.id} metric={kpi} />
          ))}
        </KpiGrid>
      </section>

      {/* CHARTS */}

      <section
        className="dashboard-section"
        aria-labelledby="talent-distribution-title"
      >
        <div className="dashboard-section__heading">
          <h2 id="talent-distribution-title">
            Talent pool distribution
          </h2>

          <p>
            Talent pool level, activity, nomination, gender, and range
            composition
          </p>
        </div>

        <div className="chart-grid chart-grid--composition">
          <ChartCard
            title="Talent pool distribution"
            description="Members by talent pool level"
          >
            <VerticalBarChart data={talentPoolDistribution} />
          </ChartCard>

          <ChartCard
            title="Active vs passive"
            description="Current status of talent pool members"
          >
            <DonutChart
              data={activePassiveDistribution}
              total="482"
            />
          </ChartCard>

          <ChartCard
            title="Nomination status (RAG)"
            description="Nomination health across the talent pool"
          >
            <DonutChart
              data={nominationStatusDistribution}
              total="482"
            />
          </ChartCard>

          <ChartCard
            title="Development pool distribution"
            description="Members across development pool categories"
          >
            <DonutChart
              data={developmentPoolDistribution}
              total="482"
            />
          </ChartCard>

          <ChartCard
            title="Gender and range distribution"
            description="Talent pool composition by gender and range"
          >
            <div className="talent-demographics">
              <div className="talent-demographics__group">
                <h3>By gender</h3>

                <DonutChart
                  data={talentGenderDistribution}
                  total="482"
                />
              </div>

              <div className="talent-demographics__group">
                <h3>By range</h3>

                <HorizontalBarChart
                  data={talentRangeDistribution}
                />
              </div>
            </div>
          </ChartCard>
        </div>
      </section>

      {/* =====================================================
          TALENT / STEP TABLES
      ===================================================== */}

      <section
        className="dashboard-section talent-register-section"
        aria-labelledby="talent-register-title"
      >
        <div className="dashboard-section__heading">
          <h2 id="talent-register-title">
            Talent and STEP registers
          </h2>

          <p>
            Talent availability, STEP opportunities and
            development information
          </p>
        </div>

        {/* TOP TWO TABLES */}

        <div className="talent-table-grid">
          <DataTable
            title="STEP-Available Talent (People)"
            description="Talent currently available or planned for STEP assignments"
            columns={stepAvailableTalentColumns}
            rows={stepAvailableTalent}
            getRowKey={(row) => row.personnelNo}
            downloadFileName="step-available-talent"
            pageSizeOptions={[5, 10, 25]}
          />

          <div className="talent-active-step">
            {activeStepError && <p role="alert">{activeStepError}</p>}
            <DataTable
              title="Active STEP"
              description="Every employee assignment in the latest confirmed STEP workbook"
              columns={activeStepColumns}
              rows={activeStepRows}
              getRowKey={(row) => row.id}
              downloadFileName="active-step"
              pageSizeOptions={[5, 10, 25]}
              groupFilters
            />
          </div>
        </div>

        <PoolRegisterTable kind="development" />
        <PoolRegisterTable kind="talent" />
      </section>
    </main>
  );
}
