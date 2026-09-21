import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const managedRoles = [
  'admin',
  'range_head',
  'department_head',
  'sub_department_head',
] as const;

export type ManagedRole = (typeof managedRoles)[number];

export class EmployeeCandidateDto {
  @ApiProperty({ example: '12345678' })
  persNo!: string;

  @ApiProperty({ example: 'Jane Doe' })
  employeeName!: string;

  @ApiPropertyOptional({ example: 'jane.doe@bosch.com', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  range!: string | null;

  @ApiPropertyOptional({ nullable: true })
  orgUnit!: string | null;

  @ApiPropertyOptional({ nullable: true })
  designation!: string | null;

  @ApiProperty()
  hasAccount!: boolean;
}

export class AccessAssignmentDto {
  @ApiProperty()
  assignmentId!: string;

  @ApiProperty()
  accountId!: string;

  @ApiProperty({ example: '12345678' })
  persNo!: string;

  @ApiProperty()
  employeeName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['active', 'inactive', 'locked'] })
  accountStatus!: 'active' | 'inactive' | 'locked';

  @ApiProperty()
  mustChangePassword!: boolean;

  @ApiProperty({ enum: managedRoles })
  role!: ManagedRole;

  @ApiPropertyOptional({ nullable: true })
  assignedRange!: string | null;

  @ApiPropertyOptional({ nullable: true })
  assignedOrgUnit!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class CreateAccessAssignmentDto {
  @ApiProperty({ example: '12345678' })
  persNo!: string;

  @ApiProperty({ enum: managedRoles })
  role!: ManagedRole;

  @ApiPropertyOptional({ nullable: true })
  assignedRange?: string | null;

  @ApiPropertyOptional({ nullable: true })
  assignedOrgUnit?: string | null;

  @ApiPropertyOptional({ minLength: 12, description: 'Required for a new account' })
  temporaryPassword?: string;
}

export class UpdateAccessAssignmentDto {
  @ApiProperty({ enum: managedRoles })
  role!: ManagedRole;

  @ApiPropertyOptional({ nullable: true })
  assignedRange?: string | null;

  @ApiPropertyOptional({ nullable: true })
  assignedOrgUnit?: string | null;
}
