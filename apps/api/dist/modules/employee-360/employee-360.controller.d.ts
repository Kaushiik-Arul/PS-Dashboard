import type { AuthenticatedUser } from '../auth/auth.types';
import { Employee360Service } from './employee-360.service';
import { Employee360QueryDto, Employee360ResponseDto } from './dto/employee-360.dto';
export declare class Employee360Controller {
    private readonly service;
    constructor(service: Employee360Service);
    getEmployees(query: Employee360QueryDto, user: AuthenticatedUser): Promise<Employee360ResponseDto>;
    getProfile(persNo: string, user: AuthenticatedUser): Promise<{
        employee: import("./dto/employee-360.dto").Employee360RowDto;
        careerJourney: import("./career-journey.types").CareerJourneyEvent[];
        pppHistory: import("./dto/employee-360.dto").EmployeePppHistoryDto[];
        stepOverview: import("./dto/employee-360.dto").EmployeeStepOverviewDto;
        idpStatus: import("./dto/employee-360.dto").EmployeeIdpStatusDto;
        talentPortfolio: import("./dto/employee-360.dto").EmployeeTalentPortfolioDto;
        developmentPortfolio: import("./dto/employee-360.dto").EmployeeDevelopmentPortfolioDto | null;
    }>;
    createCareerEvent(persNo: string, body: unknown, user: AuthenticatedUser): Promise<import("./career-journey.types").CareerJourneyEvent>;
    updateJobDescription(persNo: string, body: unknown, user: AuthenticatedUser): Promise<{
        jdId: string;
        jdName: string;
        effectiveDate: string;
        changed: boolean;
    }>;
    updateStepAvailability(persNo: string, body: unknown, user: AuthenticatedUser): Promise<import("./dto/employee-360.dto").EmployeeStepAvailabilityDto>;
    updateIdpStatus(persNo: string, body: unknown, user: AuthenticatedUser): Promise<import("./dto/employee-360.dto").EmployeeIdpStatusDto>;
    updateCareerEvent(persNo: string, eventId: string, body: unknown, user: AuthenticatedUser): Promise<import("./career-journey.types").CareerJourneyEvent>;
    deleteCareerEvent(persNo: string, eventId: string, user: AuthenticatedUser): Promise<void>;
}
