import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessPointService } from './access-point.service';
import { AccessAssignmentDto, CreateAccessAssignmentDto, EmployeeCandidateDto, UpdateAccessAssignmentDto } from './dto/access-point.dto';
export declare class AccessPointController {
    private readonly service;
    constructor(service: AccessPointService);
    searchEmployees(query: string): Promise<EmployeeCandidateDto[]>;
    getScopeOptions(range?: string): Promise<{
        ranges: string[];
        orgUnits: string[];
    }>;
    listAssignments(): Promise<AccessAssignmentDto[]>;
    createAssignment(input: CreateAccessAssignmentDto, user: AuthenticatedUser, request: Request): Promise<AccessAssignmentDto>;
    updateAssignment(assignmentId: string, input: UpdateAccessAssignmentDto, user: AuthenticatedUser, request: Request): Promise<AccessAssignmentDto>;
    deactivateAccount(accountId: string, user: AuthenticatedUser, request: Request): Promise<void>;
}
