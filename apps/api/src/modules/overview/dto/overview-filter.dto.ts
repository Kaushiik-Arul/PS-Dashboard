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

  @ApiPropertyOptional({ type: [String] })
  functionName?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  orgUnit?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  range?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  location?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  gender?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  directOrIndirect?: string | string[];
}

export class OverviewDetailsFilterDto extends OverviewFilterDto {
  @ApiProperty({ enum: overviewDetailMetrics })
  metric!: string;
}

export type NormalizedOverviewFilters = {
  reportingMonth: string | null;
  functionName: string[];
  orgUnit: string[];
  range: string[];
  location: string[];
  gender: string[];
  directOrIndirect: string[];
};