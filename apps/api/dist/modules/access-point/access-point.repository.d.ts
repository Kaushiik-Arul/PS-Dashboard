import { DatabaseService } from '../../database/database.service';
import type { RequestMetadata } from '../auth/auth.types';
import type { AccessAssignmentDto, EmployeeCandidateDto, ManagedRole } from './dto/access-point.dto';
export type AssignmentValues = {
    role: ManagedRole;
    assignedRange: string | null;
    assignedOrgUnit: string | null;
};
export declare class AccessPointRepository {
    private readonly database;
    constructor(database: DatabaseService);
    searchEmployees(query: string): Promise<EmployeeCandidateDto[]>;
    getEmployee(persNo: string): Promise<EmployeeCandidateDto | null>;
    getScopeOptions(range: string | null): Promise<{
        ranges: string[];
        orgUnits: string[];
    }>;
    scopeExists(assignedRange: string, assignedOrgUnit: string | null): Promise<boolean>;
    listAssignments(): Promise<AccessAssignmentDto[]>;
    createAssignment(employee: EmployeeCandidateDto, values: AssignmentValues, passwordHash: string | null, actorAccountId: string, metadata: RequestMetadata): Promise<AccessAssignmentDto>;
    updateAssignment(assignmentId: string, values: AssignmentValues, actorAccountId: string, metadata: RequestMetadata): Promise<AccessAssignmentDto | null>;
    deactivateAccount(accountId: string, actorAccountId: string, metadata: RequestMetadata): Promise<boolean>;
    private insertAudit;
}
