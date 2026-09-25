import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Employee360QueryDto {
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional() functionName?: string;
  @ApiPropertyOptional() orgUnit?: string;
  @ApiPropertyOptional() range?: string;
  @ApiPropertyOptional() location?: string;
  @ApiPropertyOptional() gender?: string;
  @ApiPropertyOptional() directOrIndirect?: string;
}

export type NormalizedEmployee360Query = {
  search: string | null;
  functionName: string | null;
  orgUnit: string | null;
  range: string | null;
  location: string | null;
  gender: string | null;
  directOrIndirect: string | null;
};

export class Employee360RowDto {
  @ApiProperty() persNo!: string;
  @ApiPropertyOptional({ nullable: true }) personnelNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) employeeGroup!: string | null;
  @ApiPropertyOptional({ nullable: true }) psGroup!: string | null;
  @ApiPropertyOptional({ nullable: true }) orgUnit!: string | null;
  @ApiPropertyOptional({ nullable: true }) range!: string | null;
  @ApiPropertyOptional({ nullable: true }) functionName!: string | null;
  @ApiPropertyOptional({ nullable: true }) gender!: string | null;
  @ApiPropertyOptional({ nullable: true }) location!: string | null;
  @ApiPropertyOptional({ nullable: true }) ntId!: string | null;
  @ApiPropertyOptional({ nullable: true }) globalId!: string | null;
  @ApiPropertyOptional({ nullable: true }) costCenter!: string | null;
  @ApiPropertyOptional({ nullable: true }) birthDate!: string | null;
  @ApiPropertyOptional({ nullable: true }) joiningDate!: string | null;
  @ApiPropertyOptional({ nullable: true }) entryForRetirement!: string | null;
  @ApiPropertyOptional({ nullable: true }) designationText!: string | null;
  @ApiPropertyOptional({ nullable: true }) hrbpGlobalId!: string | null;
  @ApiPropertyOptional({ nullable: true }) hrbp2GlobalId!: string | null;
  @ApiPropertyOptional({ nullable: true }) officialEmail!: string | null;
  @ApiPropertyOptional({ nullable: true }) technicalEntryDate!: string | null;
  @ApiPropertyOptional({ nullable: true }) directOrIndirect!: string | null;
}

export class Employee360FilterOptionsDto {
  @ApiProperty({ type: [String] }) functionName!: string[];
  @ApiProperty({ type: [String] }) orgUnit!: string[];
  @ApiProperty({ type: [String] }) range!: string[];
  @ApiProperty({ type: [String] }) location!: string[];
  @ApiProperty({ type: [String] }) gender!: string[];
  @ApiProperty({ type: [String] }) directOrIndirect!: string[];
}

export class Employee360ResponseDto {
  @ApiProperty({ type: [Employee360RowDto] }) employees!: Employee360RowDto[];
  @ApiProperty({ type: Employee360FilterOptionsDto }) filterOptions!: Employee360FilterOptionsDto;
}

export class EmployeePppHistoryDto {
  @ApiProperty() year!: number;
  @ApiPropertyOptional({ nullable: true }) performance!: string | null;
  @ApiPropertyOptional({ nullable: true }) position!: string | null;
  @ApiPropertyOptional({ nullable: true }) person!: string | null;
  @ApiPropertyOptional({ nullable: true }) tcl!: string | null;
}

export class Employee360ProfileResponseDto {
  @ApiProperty({ type: Employee360RowDto }) employee!: Employee360RowDto;
  @ApiProperty({ type: [Object] }) careerJourney!: unknown[];
  @ApiProperty({ type: [EmployeePppHistoryDto] }) pppHistory!: EmployeePppHistoryDto[];
}