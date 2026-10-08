export type TalentPipelineKpiValue = {
  value: number;
  percentage: number | null;
};

export type TalentPipelineChartDatum = {
  label: string;
  value: number;
  percentage: number | null;
};

export type TalentPipelineDistribution = {
  data: TalentPipelineChartDatum[];
};

export type TalentPipelineQueryFilters = {
  reportingMonth?: string;
  functionName?: string;
  orgUnit?: string;
  range?: string;
  location?: string;
  gender?: string;
  directOrIndirect?: string;
};

export type TalentPipelineFilterOptions = {
  functionName: string[];
  orgUnit: string[];
  range: string[];
  location: string[];
  gender: string[];
  directOrIndirect: string[];
};

export type TalentPipelineResponse = {
  asOfDate: string;
  workforceHeadcount: number | null;
  kpis: {
    totalTalentPool: TalentPipelineKpiValue;
    activeTalentPool: TalentPipelineKpiValue;
    passiveTalentPool: TalentPipelineKpiValue;
    developmentPool: TalentPipelineKpiValue;
    femaleTalent: TalentPipelineKpiValue;
    keyToRetain: TalentPipelineKpiValue;
    futureTalent: TalentPipelineKpiValue;
    changeWanted: TalentPipelineKpiValue;
    talentPoolExpiring: {
      within6Months: number;
      within12Months: number;
    };
  };
  charts: {
    nominationYear: number | null;
    talentPoolDistribution: TalentPipelineDistribution;
    activePassiveDistribution: TalentPipelineDistribution;
    nominationStatusDistribution: TalentPipelineDistribution;
    developmentPoolDistribution: TalentPipelineDistribution;
    talentGenderDistribution: TalentPipelineDistribution;
    talentRangeDistribution: TalentPipelineDistribution;
  };
  filterOptions: TalentPipelineFilterOptions;
};

export type TalentPipelineHistoryState = {
  snapshotMonths: string[];
};

export type TalentPipelineView = "talent-pool" | "development-pool";