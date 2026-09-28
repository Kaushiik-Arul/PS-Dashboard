import type { AuthenticatedUser } from '../auth/auth.types';
import type { Employee360QueryDto, Employee360ResponseDto } from './dto/employee-360.dto';
import { Employee360Repository } from './employee-360.repository';
import { CareerJourneyRepository } from './career-journey.repository';
import type { CareerJourneyEvent } from './career-journey.types';
export declare class Employee360Service {
    private readonly repository;
    private readonly careerJourneyRepository;
    private readonly logger;
    constructor(repository: Employee360Repository, careerJourneyRepository: CareerJourneyRepository);
    getEmployees(input: Employee360QueryDto, user: AuthenticatedUser): Promise<Employee360ResponseDto>;
    getProfile(persNoInput: string, user: AuthenticatedUser): Promise<{
        employee: import("./dto/employee-360.dto").Employee360RowDto;
        careerJourney: CareerJourneyEvent[];
        pppHistory: import("./dto/employee-360.dto").EmployeePppHistoryDto[];
    }>;
    createCareerEvent(persNoInput: string, body: unknown, user: AuthenticatedUser): Promise<CareerJourneyEvent>;
    updateCareerEvent(persNoInput: string, idInput: string, body: unknown, user: AuthenticatedUser): Promise<CareerJourneyEvent>;
    deleteCareerEvent(persNoInput: string, idInput: string, user: AuthenticatedUser): Promise<void>;
    updateJobDescription(persNoInput: string, body: unknown, user: AuthenticatedUser): Promise<{
        jdId: string;
        jdName: string;
        effectiveDate: string;
        changed: boolean;
    }>;
    private assertScopedEmployee;
    private careerInput;
    private jobDescriptionInput;
    private persNo;
    private uuid;
    private run;
    private normalize;
}
