export declare class KpiValueDto {
    value: number | null;
    unit?: string;
}
export declare class OverviewKpisDto {
    totalHeadcount: KpiValueDto;
    directHeadcount: KpiValueDto;
    indirectHeadcount: KpiValueDto;
    femalePercentage: KpiValueDto;
    averageAge: KpiValueDto;
    averageTenure: KpiValueDto;
    retirementWithinThreeYears: KpiValueDto;
    maternity: KpiValueDto;
    sabbatical: KpiValueDto;
    crl: KpiValueDto;
}
export declare class ChartDatumDto {
    label: string;
    value: number;
    percentage: number | null;
}
export declare class DistributionChartDto {
    data: ChartDatumDto[];
}
export declare class RetirementRiskRowDto {
    functionName: string;
    oneYear: number;
    threeYears: number;
    fiveYears: number;
}
export declare class OverviewChartsDto {
    headcountByPsGroup: DistributionChartDto;
    genderDistribution: DistributionChartDto;
    headcountByFunction: DistributionChartDto;
    headcountByLocation: DistributionChartDto;
    ageProfile: DistributionChartDto;
    tenureProfile: DistributionChartDto;
    retirementRisk: RetirementRiskRowDto[];
    workforceMovement: DistributionChartDto;
}
export declare class OverviewResponseDto {
    asOfDate: string;
    kpis: OverviewKpisDto;
    charts: OverviewChartsDto;
}
