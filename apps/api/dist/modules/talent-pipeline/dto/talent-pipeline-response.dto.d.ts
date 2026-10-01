export declare class TalentPipelineKpiValueDto {
    value: number;
    percentage: number | null;
}
export declare class TalentPoolExpiringDto {
    within6Months: number;
    within12Months: number;
}
export declare class TalentPipelineKpisDto {
    totalTalentPool: TalentPipelineKpiValueDto;
    activeTalentPool: TalentPipelineKpiValueDto;
    passiveTalentPool: TalentPipelineKpiValueDto;
    developmentPool: TalentPipelineKpiValueDto;
    femaleTalent: TalentPipelineKpiValueDto;
    keyToRetain: TalentPipelineKpiValueDto;
    futureTalent: TalentPipelineKpiValueDto;
    changeWanted: TalentPipelineKpiValueDto;
    talentPoolExpiring: TalentPoolExpiringDto;
}
export declare class TalentPipelineChartDatumDto {
    label: string;
    value: number;
    percentage: number | null;
}
export declare class TalentPipelineDistributionDto {
    data: TalentPipelineChartDatumDto[];
}
export declare class TalentPipelineChartsDto {
    nominationYear: number | null;
    talentPoolDistribution: TalentPipelineDistributionDto;
    activePassiveDistribution: TalentPipelineDistributionDto;
    nominationStatusDistribution: TalentPipelineDistributionDto;
    developmentPoolDistribution: TalentPipelineDistributionDto;
    talentGenderDistribution: TalentPipelineDistributionDto;
    talentRangeDistribution: TalentPipelineDistributionDto;
}
export declare class TalentPipelineFilterOptionsDto {
    functionName: string[];
    orgUnit: string[];
    range: string[];
    location: string[];
    gender: string[];
    directOrIndirect: string[];
}
export declare class TalentPipelineResponseDto {
    asOfDate: string;
    kpis: TalentPipelineKpisDto;
    charts: TalentPipelineChartsDto;
    filterOptions: TalentPipelineFilterOptionsDto;
}
