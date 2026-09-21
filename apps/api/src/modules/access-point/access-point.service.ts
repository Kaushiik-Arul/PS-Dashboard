import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { RequestMetadata } from '../auth/auth.types';
import { AccessPointRepository, type AssignmentValues } from './access-point.repository';
import {
  managedRoles,
  type AccessAssignmentDto,
  type CreateAccessAssignmentDto,
  type EmployeeCandidateDto,
  type ManagedRole,
  type UpdateAccessAssignmentDto,
} from './dto/access-point.dto';

@Injectable()
export class AccessPointService {
  constructor(
    private readonly repository: AccessPointRepository,
    private readonly authService: AuthService,
  ) {}

  searchEmployees(queryInput: unknown): Promise<EmployeeCandidateDto[]> {
    const query = typeof queryInput === 'string' ? queryInput.trim() : '';
    if (query.length < 2 || query.length > 100) {
      throw new BadRequestException('Enter at least 2 characters to search');
    }
    return this.repository.searchEmployees(query);
  }

  getScopeOptions(rangeInput: unknown) {
    const range = typeof rangeInput === 'string' && rangeInput.trim()
      ? rangeInput.trim()
      : null;
    return this.repository.getScopeOptions(range);
  }

  listAssignments(): Promise<AccessAssignmentDto[]> {
    return this.repository.listAssignments();
  }

  async createAssignment(
    input: CreateAccessAssignmentDto,
    actorAccountId: string,
    metadata: RequestMetadata,
  ): Promise<AccessAssignmentDto> {
    const persNo = this.parsePersNo(input?.persNo);
    const values = await this.parseAssignment(input);
    const employee = await this.repository.getEmployee(persNo);
    if (!employee) throw new NotFoundException('Employee was not found in the namelist');
    if (
      !employee.email ||
      employee.email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)
    ) {
      throw new BadRequestException('The employee has no official email in the namelist');
    }

    let passwordHash: string | null = null;
    if (!employee.hasAccount) {
      passwordHash = await this.authService.hashTemporaryPassword(
        input.temporaryPassword,
      );
    }

    try {
      return await this.repository.createAssignment(
        employee,
        values,
        passwordHash,
        actorAccountId,
        metadata,
      );
    } catch (error) {
      this.translateWriteError(error);
    }
  }

  async updateAssignment(
    assignmentId: string,
    input: UpdateAccessAssignmentDto,
    actorAccountId: string,
    metadata: RequestMetadata,
  ): Promise<AccessAssignmentDto> {
    if (!this.isUuid(assignmentId)) {
      throw new BadRequestException('Assignment ID is invalid');
    }
    const values = await this.parseAssignment(input);
    try {
      const updated = await this.repository.updateAssignment(
        assignmentId,
        values,
        actorAccountId,
        metadata,
      );
      if (!updated) throw new NotFoundException('Access assignment was not found');
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.translateWriteError(error);
    }
  }

  async deactivateAccount(
    accountId: string,
    actorAccountId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    if (!this.isUuid(accountId)) throw new BadRequestException('Account ID is invalid');
    if (accountId === actorAccountId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    if (!(await this.repository.deactivateAccount(accountId, actorAccountId, metadata))) {
      throw new NotFoundException('Active account was not found');
    }
  }

  private async parseAssignment(input: UpdateAccessAssignmentDto): Promise<AssignmentValues> {
    if (!input || !managedRoles.includes(input.role)) {
      throw new BadRequestException('Role is invalid');
    }
    const role: ManagedRole = input.role;
    const assignedRange = this.optionalText(input.assignedRange);
    const assignedOrgUnit = this.optionalText(input.assignedOrgUnit);

    if (role === 'admin') {
      if (assignedRange || assignedOrgUnit) {
        throw new BadRequestException('Admin access cannot have a Range or Org Unit');
      }
      return { role, assignedRange: null, assignedOrgUnit: null };
    }
    if (!assignedRange) throw new BadRequestException('Range is required for Head access');
    if (role === 'range_head' && assignedOrgUnit) {
      throw new BadRequestException('Range Head access cannot have an Org Unit');
    }
    if (role !== 'range_head' && !assignedOrgUnit) {
      throw new BadRequestException('Org Unit is required for this Head role');
    }
    if (!(await this.repository.scopeExists(assignedRange, assignedOrgUnit))) {
      throw new BadRequestException('The selected Range and Org Unit are not in the namelist');
    }
    return { role, assignedRange, assignedOrgUnit };
  }

  private parsePersNo(value: unknown): string {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException('Personnel number is invalid');
    }
    return value;
  }

  private optionalText(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') throw new BadRequestException('Scope value is invalid');
    const normalized = value.trim();
    if (normalized.length > 200) throw new BadRequestException('Scope value is too long');
    return normalized || null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private translateWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : '';
    const databaseError = typeof error === 'object' && error !== null
      ? error as { code?: unknown; constraint?: unknown }
      : null;
    if (message === 'ACCOUNT_INACTIVE') {
      throw new ConflictException('The employee account is inactive');
    }
    if (message === 'INCOMPATIBLE_ACCESS') {
      throw new ConflictException('Unrestricted and Head access cannot be combined');
    }
    if (
      databaseError?.code === '23505' &&
      databaseError.constraint === 'auth_accounts_login_email_unique'
    ) {
      throw new ConflictException(
        'The official email is already linked to another account',
      );
    }
    if (message === 'DUPLICATE_ASSIGNMENT' || databaseError?.code === '23505') {
      throw new ConflictException('This access assignment already exists');
    }
    throw error;
  }
}
