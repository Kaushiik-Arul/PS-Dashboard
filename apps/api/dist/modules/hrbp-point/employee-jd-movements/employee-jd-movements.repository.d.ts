import { DatabaseService } from '../../../database/database.service';
import type { EmployeeJdMovementFilters, EmployeeJdMovementPage } from './employee-jd-movements.types';
export declare class EmployeeJdMovementsRepository {
    private readonly database;
    constructor(database: DatabaseService);
    list(filters: EmployeeJdMovementFilters, page: number, pageSize: number): Promise<EmployeeJdMovementPage>;
}
