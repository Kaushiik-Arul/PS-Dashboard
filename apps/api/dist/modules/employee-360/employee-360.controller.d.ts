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
    }>;
    createCareerEvent(persNo: string, body: unknown, user: AuthenticatedUser): Promise<import("./career-journey.types").CareerJourneyEvent>;
    updateCareerEvent(persNo: string, eventId: string, body: unknown, user: AuthenticatedUser): Promise<import("./career-journey.types").CareerJourneyEvent>;
    deleteCareerEvent(persNo: string, eventId: string, user: AuthenticatedUser): Promise<void>;
}
