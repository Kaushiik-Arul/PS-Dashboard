import { DatabaseService } from '../../database/database.service';
import type { Employee360ResponseDto, NormalizedEmployee360Query } from './dto/employee-360.dto';
export declare class Employee360Repository {
    private readonly database;
    constructor(database: DatabaseService);
    getEmployees(filters: NormalizedEmployee360Query, accountId: string, persNo: string | null): Promise<Employee360ResponseDto>;
}
