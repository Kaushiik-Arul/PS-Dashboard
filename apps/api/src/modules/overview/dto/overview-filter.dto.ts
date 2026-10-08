import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const overviewDetailMetrics = [
  'total-hc',
  'direct-hc',
  'indirect-hc',
  'female-pct',
  'avg-age',
  'avg-tenure',
  'ret-3yrs',
  'maternity',
  'sabbatical',
  'crl',
] as const;

export type OverviewDetailMetric = (typeof overviewDetailMetrics)[number];

export class OverviewFilterDto {
  @ApiPropertyOptional({ example: '2026-09' })
  reportingMonth?: string;

  @ApiPropertyOptional()
  functionName?: string;

  @ApiPropertyOptional()
  orgUnit?: string;

  @ApiPropertyOptional()
  range?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  gender?: string;

  @ApiPropertyOptional()
  directOrIndirect?: string;
}

export class OverviewDetailsFilterDto extends OverviewFilterDto {
  @ApiProperty({ enum: overviewDetailMetrics })
  metric!: string;
}

export type NormalizedOverviewFilters = {
  reportingMonth: string | null;
  functionName: string | null;
  orgUnit: string | null;
  range: string | null;
  location: string | null;
  gender: string | null;
  directOrIndirect: string | null;
};