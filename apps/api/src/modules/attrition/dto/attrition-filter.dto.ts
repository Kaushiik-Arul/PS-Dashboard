import { ApiPropertyOptional } from '@nestjs/swagger';

export class AttritionFilterDto {
  @ApiPropertyOptional({ type: [String] })
  year?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  separationType?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  orgUnit?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  range?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  reasonForAction?: string | string[];
}

export type NormalizedAttritionFilters = {
  years: number[];
  separationTypes: string[];
  orgUnits: string[];
  ranges: string[];
  reasonsForAction: string[];
};