import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const employeeStatusTypes = [
  'Maternity',
  'Sabbatical',
  'CRL',
  'Absconding',
] as const;

export type EmployeeStatusType = (typeof employeeStatusTypes)[number];

export class EmployeeStatusResponseDto {
  @ApiProperty({ example: '12345678' })
  persNo!: string;

  @ApiProperty({ enum: employeeStatusTypes })
  statusType!: EmployeeStatusType;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  startDate!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  endDate!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ example: 'hrbp' })
  updatedBy!: string;
}

export class CreateEmployeeStatusDto {
  @ApiProperty({ example: '12345678' })
  persNo!: string;

  @ApiProperty({ enum: employeeStatusTypes })
  statusType!: EmployeeStatusType;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  startDate?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  endDate?: string | null;

  @ApiProperty({ example: 'hrbp' })
  updatedBy!: string;
}

export class UpdateEmployeeStatusDto {
  @ApiProperty({ enum: employeeStatusTypes })
  statusType!: EmployeeStatusType;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  startDate?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  endDate?: string | null;

  @ApiProperty({ example: 'hrbp' })
  updatedBy!: string;
}