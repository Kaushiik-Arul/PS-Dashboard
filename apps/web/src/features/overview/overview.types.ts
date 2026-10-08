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

export type OverviewQueryFilters = {
  reportingMonth?: string;
  functionName?: string;
  orgUnit?: string;
  range?: string;
  location?: string;
  gender?: string;
  directOrIndirect?: string;
};

export type OverviewFilterOptions = {
  functionName: string[];
  orgUnit: string[];
  range: string[];
  location: string[];
  gender: string[];
  directOrIndirect: string[];
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
  filterOptions: OverviewFilterOptions;
};

export type OverviewAvailableMonths = {
  currentMonth: string | null;
  detailedMonths: string[];
};

export type OverviewDetailMetric =
  | "total-hc"
  | "direct-hc"
  | "indirect-hc"
  | "female-pct"
  | "avg-age"
  | "avg-tenure"
  | "ret-3yrs"
  | "maternity"
  | "sabbatical"
  | "crl";

export type OverviewEmployeeDetail = {
  personnelNumber: string;
  functionName: string | null;
  orgUnit: string | null;
  range: string | null;
  location: string | null;
  gender: string | null;
  directOrIndirect: string | null;
  ageYears: number | null;
  tenureYears: number | null;
  retirementDate: string | null;
};