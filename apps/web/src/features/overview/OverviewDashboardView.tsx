import {
  ChartCard,
  DonutChart,
  HorizontalBarChart,
  MovementChart,
  RetirementRiskTable,
  VerticalBarChart,
  type ChartDatum,
} from "@/components/charts/OverviewCharts";
import { KpiCard, type KpiMetric } from "@/components/kpi/KpiCard";
import { KpiGrid } from "@/components/kpi/KpiGrid";
import type {
  KpiValue,
  OverviewChartDatum,
  OverviewKpis,
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

function mapChartData(data: OverviewChartDatum[]): ChartDatum[] {
  return data.map((item) => ({
    label: item.label,
    value: item.value,
    displayValue: item.value.toLocaleString("en-US"),
  }));
}

function mapDonutData(data: OverviewChartDatum[]) {
  return data.map((item, index) => ({
    label: item.label,
    value: item.value,
    displayValue: item.percentage === null
      ? item.value.toLocaleString("en-US")
      : `${item.percentage.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`,
    color: chartColors[index % chartColors.length],
  }));
}

function ChartUnavailable() {
  return <p role="status">Data is not available for the selected reporting period.</p>;
}

export function OverviewDashboard({ data }: { data: OverviewResponse }) {
  const asOfLabel = formatDate(data.asOfDate, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const comparisonLabel = `As of ${asOfLabel}`;
  const kpis: KpiMetric[] = kpiDefinitions.map((definition) => ({
    id: definition.id,
    title: definition.title,
    value: formatKpiValue(data.kpis[definition.key], definition.format),
    comparisonLabel,
    icon: definition.icon,
    iconColor: definition.iconColor,
  }));
  const rangeData = mapChartData(data.charts.headcountByRange.data);
  const genderData = mapDonutData(data.charts.genderDistribution.data);
  const functionData = mapChartData(data.charts.headcountByFunction.data);
  const locationData = mapDonutData(data.charts.headcountByLocation.data);
  const ageData = mapChartData(data.charts.ageProfile.data);
  const tenureData = mapChartData(data.charts.tenureProfile.data);
  const totalLabel = data.kpis.totalHeadcount.value === null
    ? "N/A"
    : data.kpis.totalHeadcount.value.toLocaleString("en-US");
  const movement = data.charts.workforceMovement;
  const hasMovement = movement.inbound !== null
    && movement.outbound !== null
    && movement.active !== null;
  const movementData = hasMovement
    ? [{
        month: formatDate(movement.monthStart, { month: "short" }),
        inbound: movement.inbound as number,
        outbound: movement.outbound as number,
        active: movement.active as number,
      }]
    : [];

  return (
    <main className="overview-page">
      <section className="kpi-section" aria-labelledby="workforce-summary-title">
        <div className="kpi-section__header">
          <div>
            <h1 id="workforce-summary-title" className="kpi-section__title">
              Workforce summary
            </h1>
            <p className="kpi-section__description">Current calculated workforce indicators</p>
          </div>
          <span className="kpi-section__period">{asOfLabel}</span>
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
          <ChartCard title="Headcount by range" description="Employees by salary level and group">
            {rangeData.length > 0 ? <HorizontalBarChart data={rangeData} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Gender distribution" description="Share of total workforce">
            {genderData.length > 0 ? <DonutChart data={genderData} total={totalLabel} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Headcount by function" description="Employees across business functions">
            {functionData.length > 0 ? <HorizontalBarChart data={functionData} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Headcount by location" description="Employees across major sites">
            {locationData.length > 0 ? <DonutChart data={locationData} total={totalLabel} /> : <ChartUnavailable />}
          </ChartCard>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="profile-title">
        <div className="dashboard-section__heading">
          <h2 id="profile-title">Workforce profile and movement</h2>
          <p>Age, tenure, retirement exposure, and current-period workforce movement</p>
        </div>
        <div className="chart-grid chart-grid--profiles">
          <ChartCard title="Age profile" description="Headcount by age range">
            {ageData.length > 0 ? <VerticalBarChart data={ageData} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Tenure profile" description="Headcount by completed service">
            {tenureData.length > 0 ? <VerticalBarChart data={tenureData} tone="turquoise" /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Workforce movement" description={`Inbound, outbound, and active employees through ${formatDate(movement.throughDate, { day: "numeric", month: "long", year: "numeric" })}`}>
            {hasMovement ? <MovementChart data={movementData} period={asOfLabel} /> : <ChartUnavailable />}
          </ChartCard>
          <ChartCard title="Retirement risk" description="Employees reaching retirement eligibility">
            {data.charts.retirementRisk.length > 0
              ? <RetirementRiskTable rows={data.charts.retirementRisk} />
              : <ChartUnavailable />}
          </ChartCard>
        </div>
      </section>
    </main>
  );
}