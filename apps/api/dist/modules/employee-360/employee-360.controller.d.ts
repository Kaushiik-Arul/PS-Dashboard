import type { AuthenticatedUser } from '../auth/auth.types';
import { Employee360Service } from './employee-360.service';
import { Employee360QueryDto, Employee360ResponseDto } from './dto/employee-360.dto';
export declare class Employee360Controller {
    private readonly service;
    constructor(service: Employee360Service);
    getEmployees(query: Employee360QueryDto, user: AuthenticatedUser): Promise<Employee360ResponseDto>;
}
