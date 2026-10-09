import { ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessionPlanningFilterDto {
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

export type NormalizedSuccessionPlanningFilters = {
  functionName: string[];
  orgUnit: string[];
  range: string[];
  location: string[];
  gender: string[];
  directOrIndirect: string[];
};
