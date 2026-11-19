import { ApiPropertyOptional } from '@nestjs/swagger';

export class AttritionFilterDto {
  @ApiPropertyOptional({ type: [String] })
  year?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  separationType?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  range2?: string | string[];

  @ApiPropertyOptional({ type: [String] })
  reasonForAction?: string | string[];
}

export type NormalizedAttritionFilters = {
  years: number[];
  separationTypes: string[];
  ranges2: string[];
  reasonsForAction: string[];
};