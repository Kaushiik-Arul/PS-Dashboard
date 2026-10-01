import { ApiProperty } from '@nestjs/swagger';

export class TalentPipelineKpiValueDto {
  @ApiProperty()
  value!: number;

  @ApiProperty({ type: Number, nullable: true })
  percentage!: number | null;
}

export class TalentPoolExpiringDto {
  @ApiProperty()
  within6Months!: number;

  @ApiProperty()
  within12Months!: number;
}

export class TalentPipelineKpisDto {
  @ApiProperty({ type: TalentPipelineKpiValueDto })
  totalTalentPool!: TalentPipelineKpiValueDto;

  @ApiProperty({ type: TalentPipelineKpiValueDto })
  activeTalentPool!: TalentPipelineKpiValueDto;

  @ApiProperty({ type: TalentPipelineKpiValueDto })
  passiveTalentPool!: TalentPipelineKpiValueDto;

  @ApiProperty({ type: TalentPipelineKpiValueDto })
  developmentPool!: TalentPipelineKpiValueDto;

  @ApiProperty({ type: TalentPipelineKpiValueDto })
  femaleTalent!: TalentPipelineKpiValueDto;

  @ApiProperty({ type: TalentPipelineKpiValueDto })
  keyToRetain!: TalentPipelineKpiValueDto;

  @ApiProperty({ type: TalentPipelineKpiValueDto })
  futureTalent!: TalentPipelineKpiValueDto;

  @ApiProperty({ type: TalentPipelineKpiValueDto })
  changeWanted!: TalentPipelineKpiValueDto;

  @ApiProperty({ type: TalentPoolExpiringDto })
  talentPoolExpiring!: TalentPoolExpiringDto;
}

export class TalentPipelineChartDatumDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: number;

  @ApiProperty({ type: Number, nullable: true })
  percentage!: number | null;
}

export class TalentPipelineDistributionDto {
  @ApiProperty({ type: [TalentPipelineChartDatumDto] })
  data!: TalentPipelineChartDatumDto[];
}

export class TalentPipelineChartsDto {
  @ApiProperty({ type: Number, nullable: true })
  nominationYear!: number | null;

  @ApiProperty({ type: TalentPipelineDistributionDto })
  talentPoolDistribution!: TalentPipelineDistributionDto;

  @ApiProperty({ type: TalentPipelineDistributionDto })
  activePassiveDistribution!: TalentPipelineDistributionDto;

  @ApiProperty({ type: TalentPipelineDistributionDto })
  nominationStatusDistribution!: TalentPipelineDistributionDto;

  @ApiProperty({ type: TalentPipelineDistributionDto })
  developmentPoolDistribution!: TalentPipelineDistributionDto;

  @ApiProperty({ type: TalentPipelineDistributionDto })
  talentGenderDistribution!: TalentPipelineDistributionDto;

  @ApiProperty({ type: TalentPipelineDistributionDto })
  talentRangeDistribution!: TalentPipelineDistributionDto;
}

export class TalentPipelineFilterOptionsDto {
  @ApiProperty({ type: [String] })
  functionName!: string[];

  @ApiProperty({ type: [String] })
  orgUnit!: string[];

  @ApiProperty({ type: [String] })
  range!: string[];

  @ApiProperty({ type: [String] })
  location!: string[];

  @ApiProperty({ type: [String] })
  gender!: string[];

  @ApiProperty({ type: [String] })
  directOrIndirect!: string[];
}

export class TalentPipelineResponseDto {
  @ApiProperty({ format: 'date' })
  asOfDate!: string;

  @ApiProperty({ type: TalentPipelineKpisDto })
  kpis!: TalentPipelineKpisDto;

  @ApiProperty({ type: TalentPipelineChartsDto })
  charts!: TalentPipelineChartsDto;

  @ApiProperty({ type: TalentPipelineFilterOptionsDto })
  filterOptions!: TalentPipelineFilterOptionsDto;
}