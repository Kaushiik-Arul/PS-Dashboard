import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KpiValueDto {
  @ApiProperty({ type: Number, nullable: true })
  value!: number | null;

  @ApiPropertyOptional({ description: 'Display unit returned by the KPI' })
  unit?: string;
}

export class OverviewKpisDto {
  @ApiProperty({ type: KpiValueDto })
  totalHeadcount!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  directHeadcount!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  indirectHeadcount!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  femalePercentage!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  averageAge!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  averageTenure!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  retirementWithinThreeYears!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  maternity!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  sabbatical!: KpiValueDto;

  @ApiProperty({ type: KpiValueDto })
  crl!: KpiValueDto;
}

export class ChartDatumDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: number;

  @ApiProperty({ type: Number, nullable: true })
  percentage!: number | null;
}

export class DistributionChartDto {
  @ApiProperty({ type: [ChartDatumDto] })
  data!: ChartDatumDto[];
}

export class RetirementRiskRowDto {
  @ApiProperty()
  functionName!: string;

  @ApiProperty()
  oneYear!: number;

  @ApiProperty()
  threeYears!: number;

  @ApiProperty()
  fiveYears!: number;
}

export class OverviewChartsDto {
  @ApiProperty({ type: DistributionChartDto })
  headcountByPsGroup!: DistributionChartDto;

  @ApiProperty({ type: DistributionChartDto })
  genderDistribution!: DistributionChartDto;

  @ApiProperty({ type: DistributionChartDto })
  headcountByFunction!: DistributionChartDto;

  @ApiProperty({ type: DistributionChartDto })
  headcountByLocation!: DistributionChartDto;

  @ApiProperty({ type: DistributionChartDto })
  ageProfile!: DistributionChartDto;

  @ApiProperty({ type: DistributionChartDto })
  tenureProfile!: DistributionChartDto;

  @ApiProperty({ type: [RetirementRiskRowDto] })
  retirementRisk!: RetirementRiskRowDto[];

  @ApiProperty({ type: DistributionChartDto })
  workforceMovement!: DistributionChartDto;
}

export class OverviewResponseDto {
  @ApiProperty({ format: 'date' })
  asOfDate!: string;

  @ApiProperty({ type: OverviewKpisDto })
  kpis!: OverviewKpisDto;

  @ApiProperty({ type: OverviewChartsDto })
  charts!: OverviewChartsDto;
}