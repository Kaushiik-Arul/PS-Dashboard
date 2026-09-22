import type { AuthenticatedUser } from '../auth/auth.types';
import type { Employee360QueryDto, Employee360ResponseDto } from './dto/employee-360.dto';
import { Employee360Repository } from './employee-360.repository';
export declare class Employee360Service {
    private readonly repository;
    constructor(repository: Employee360Repository);
    getEmployees(input: Employee360QueryDto, user: AuthenticatedUser): Promise<Employee360ResponseDto>;
    private normalize;
}
