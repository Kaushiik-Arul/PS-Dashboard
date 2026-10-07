import { ApiPropertyOptional } from '@nestjs/swagger';

export class AttritionFilterDto {
  @ApiPropertyOptional()
  orgUnit?: string;

  @ApiPropertyOptional()
  range?: string;

  @ApiPropertyOptional()
  gender?: string;
}

export type NormalizedAttritionFilters = {
  orgUnit: string | null;
  range: string | null;
  gender: string | null;
};