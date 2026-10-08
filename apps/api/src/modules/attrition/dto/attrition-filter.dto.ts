import { ApiPropertyOptional } from '@nestjs/swagger';

export class AttritionFilterDto {
  @ApiPropertyOptional()
  year?: string;

  @ApiPropertyOptional()
  separationType?: string;

  @ApiPropertyOptional()
  orgUnit?: string;

  @ApiPropertyOptional()
  range?: string;

}

export type NormalizedAttritionFilters = {
  year: number;
  separationType: string | null;
  orgUnit: string | null;
  range: string | null;
};