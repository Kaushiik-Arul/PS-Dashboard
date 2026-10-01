import { ApiPropertyOptional } from '@nestjs/swagger';

export class TalentPipelineFilterDto {
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

export type NormalizedTalentPipelineFilters = {
  functionName: string | null;
  orgUnit: string | null;
  range: string | null;
  location: string | null;
  gender: string | null;
  directOrIndirect: string | null;
};