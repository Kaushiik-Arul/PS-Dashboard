import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Employee360QueryDto {
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional({ type: [String] }) functionName?: string | string[];
  @ApiPropertyOptional({ type: [String] }) orgUnit?: string | string[];
  @ApiPropertyOptional({ type: [String] }) range?: string | string[];
  @ApiPropertyOptional({ type: [String] }) location?: string | string[];
  @ApiPropertyOptional({ type: [String] }) gender?: string | string[];
  @ApiPropertyOptional({ type: [String] }) directOrIndirect?: string | string[];
}

export type NormalizedEmployee360Query = {
  search: string | null;
  functionName: string[];
  orgUnit: string[];
  range: string[];
  location: string[];
  gender: string[];
  directOrIndirect: string[];
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
  @ApiPropertyOptional({ nullable: true }) jdId!: string | null;
  @ApiPropertyOptional({ nullable: true }) jdName!: string | null;
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

export class EmployeeActiveStepDto {
  @ApiProperty() year!: number;
  @ApiPropertyOptional({ nullable: true }) departmentFrom!: string | null;
  @ApiPropertyOptional({ nullable: true }) departmentTo!: string | null;
  @ApiPropertyOptional({ nullable: true }) exchangedWith!: string | null;
  @ApiPropertyOptional({ nullable: true }) stepPeriodFrom!: string | null;
  @ApiPropertyOptional({ nullable: true }) stepPeriodTo!: string | null;
}

export class EmployeeStepAvailabilityDto {
  @ApiProperty() available!: boolean;
  @ApiPropertyOptional({ nullable: true }) preferences!: string | null;
  @ApiPropertyOptional({ nullable: true }) comments!: string | null;
}

export class EmployeeStepOverviewDto {
  @ApiPropertyOptional({ type: EmployeeActiveStepDto, nullable: true })
  active!: EmployeeActiveStepDto | null;

  @ApiProperty({ type: EmployeeStepAvailabilityDto })
  availability!: EmployeeStepAvailabilityDto;
}

export class EmployeeIdpStatusDto {
  @ApiProperty() available!: boolean;
  @ApiPropertyOptional({ nullable: true }) comments!: string | null;
}

export class EmployeeTalentPortfolioEntryDto {
  @ApiProperty() type!: string;
  @ApiPropertyOptional({ nullable: true }) startDate!: string | null;
  @ApiProperty() endDateOrAdmission!: string;
}

export class EmployeeTalentPortfolioDto {
  @ApiPropertyOptional({ type: EmployeeTalentPortfolioEntryDto, nullable: true })
  active!: EmployeeTalentPortfolioEntryDto | null;

  @ApiPropertyOptional({ type: EmployeeTalentPortfolioEntryDto, nullable: true })
  passive!: EmployeeTalentPortfolioEntryDto | null;

  @ApiPropertyOptional({ type: EmployeeTalentPortfolioEntryDto, nullable: true })
  nomination!: EmployeeTalentPortfolioEntryDto | null;
}

export class EmployeeDevelopmentPortfolioDto {
  @ApiProperty() developmentPool!: string;
  @ApiProperty() poolStartDate!: string;
  @ApiProperty() poolEndDate!: string;
}

export class EmployeeSuccessionPortfolioEntryDto {
  @ApiProperty() jdId!: string;
  @ApiProperty() jdName!: string;
}

export class EmployeeSuccessionPortfolioDto {
  @ApiPropertyOptional({ type: EmployeeSuccessionPortfolioEntryDto, nullable: true })
  successor1!: EmployeeSuccessionPortfolioEntryDto | null;

  @ApiPropertyOptional({ type: EmployeeSuccessionPortfolioEntryDto, nullable: true })
  successor2!: EmployeeSuccessionPortfolioEntryDto | null;
}

export class Employee360ProfileResponseDto {
  @ApiProperty({ type: Employee360RowDto }) employee!: Employee360RowDto;
  @ApiProperty({ type: [Object] }) careerJourney!: unknown[];
  @ApiProperty({ type: [EmployeePppHistoryDto] }) pppHistory!: EmployeePppHistoryDto[];
  @ApiProperty({ type: EmployeeStepOverviewDto }) stepOverview!: EmployeeStepOverviewDto;
  @ApiProperty({ type: EmployeeIdpStatusDto }) idpStatus!: EmployeeIdpStatusDto;
  @ApiProperty({ type: EmployeeTalentPortfolioDto }) talentPortfolio!: EmployeeTalentPortfolioDto;
  @ApiPropertyOptional({ type: EmployeeDevelopmentPortfolioDto, nullable: true })
  developmentPortfolio!: EmployeeDevelopmentPortfolioDto | null;
  @ApiProperty({ type: EmployeeSuccessionPortfolioDto })
  successionPortfolio!: EmployeeSuccessionPortfolioDto;
}