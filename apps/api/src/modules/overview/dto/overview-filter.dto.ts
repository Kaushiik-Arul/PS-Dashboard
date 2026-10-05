import { ApiPropertyOptional } from '@nestjs/swagger';

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

export type NormalizedOverviewFilters = {
  reportingMonth: string | null;
  functionName: string | null;
  orgUnit: string | null;
  range: string | null;
  location: string | null;
  gender: string | null;
  directOrIndirect: string | null;
};