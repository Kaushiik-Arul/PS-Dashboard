import { DatabaseService } from '../../database/database.service';
import type { EmployeeDevelopmentPortfolioDto, EmployeeIdpStatusDto, EmployeeStepAvailabilityDto, EmployeeStepOverviewDto, EmployeeTalentPortfolioDto, EmployeePppHistoryDto, Employee360ResponseDto, NormalizedEmployee360Query } from './dto/employee-360.dto';
export declare class Employee360Repository {
    private readonly database;
    constructor(database: DatabaseService);
    getIdpStatus(persNo: string): Promise<EmployeeIdpStatusDto>;
    updateIdpStatus(persNo: string, available: boolean, comments: string | null, actor: string): Promise<EmployeeIdpStatusDto>;
    updateStepAvailability(persNo: string, available: boolean, preferences: string | null, comments: string | null, actor: string): Promise<EmployeeStepAvailabilityDto>;
    getDevelopmentPortfolio(persNo: string): Promise<EmployeeDevelopmentPortfolioDto | null>;
    getTalentPortfolio(persNo: string): Promise<EmployeeTalentPortfolioDto>;
    getStepOverview(persNo: string): Promise<EmployeeStepOverviewDto>;
    getPppHistory(persNo: string): Promise<EmployeePppHistoryDto[]>;
    getEmployees(filters: NormalizedEmployee360Query, accountId: string, persNo: string | null): Promise<Employee360ResponseDto>;
    updateJobDescription(persNo: string, jdId: string, effectiveDate: string, actorAccountId: string): Promise<{
        jdId: string;
        jdName: string;
        effectiveDate: string;
        changed: boolean;
    }>;
}
