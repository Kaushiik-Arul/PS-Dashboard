import { AuthService } from '../auth/auth.service';
import type { RequestMetadata } from '../auth/auth.types';
import { AccessPointRepository } from './access-point.repository';
import { type AccessAssignmentDto, type CreateAccessAssignmentDto, type EmployeeCandidateDto, type UpdateAccessAssignmentDto } from './dto/access-point.dto';
export declare class AccessPointService {
    private readonly repository;
    private readonly authService;
    constructor(repository: AccessPointRepository, authService: AuthService);
    searchEmployees(queryInput: unknown): Promise<EmployeeCandidateDto[]>;
    getScopeOptions(rangeInput: unknown): Promise<{
        ranges: string[];
        orgUnits: string[];
    }>;
    listAssignments(): Promise<AccessAssignmentDto[]>;
    createAssignment(input: CreateAccessAssignmentDto, actorAccountId: string, metadata: RequestMetadata): Promise<AccessAssignmentDto>;
    updateAssignment(assignmentId: string, input: UpdateAccessAssignmentDto, actorAccountId: string, metadata: RequestMetadata): Promise<AccessAssignmentDto>;
    deactivateAccount(accountId: string, actorAccountId: string, metadata: RequestMetadata): Promise<void>;
    private parseAssignment;
    private parsePersNo;
    private optionalText;
    private isUuid;
    private translateWriteError;
}
