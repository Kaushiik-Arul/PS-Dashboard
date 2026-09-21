export type KpiValue = {
  value: number | null;
  unit?: string;
};

export type OverviewKpis = {
  totalHeadcount: KpiValue;
  directHeadcount: KpiValue;
  indirectHeadcount: KpiValue;
  femalePercentage: KpiValue;
  averageAge: KpiValue;
  averageTenure: KpiValue;
  retirementWithinThreeYears: KpiValue;
  maternity: KpiValue;
  sabbatical: KpiValue;
  crl: KpiValue;
};

export type OverviewChartDatum = {
  label: string;
  value: number;
  percentage: number | null;
};

export type OverviewDistributionChart = {
  data: OverviewChartDatum[];
};

export type RetirementRiskRow = {
  functionName: string;
  oneYear: number;
  threeYears: number;
  fiveYears: number;
};

export type OverviewResponse = {
  asOfDate: string;
  kpis: OverviewKpis;
  charts: {
    headcountByPsGroup: OverviewDistributionChart;
    genderDistribution: OverviewDistributionChart;
    headcountByFunction: OverviewDistributionChart;
    headcountByLocation: OverviewDistributionChart;
    ageProfile: OverviewDistributionChart;
    tenureProfile: OverviewDistributionChart;
    retirementRisk: RetirementRiskRow[];
    workforceMovement: OverviewDistributionChart;
  };
};