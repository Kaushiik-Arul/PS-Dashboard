import { DatabaseService } from '../../database/database.service';
import type { EmployeeStatusResponseDto, EmployeeStatusType } from './dto/employee-status.dto';
type EmployeeStatusValues = {
    statusType: EmployeeStatusType;
    startDate: string | null;
    endDate: string | null;
    updatedBy: string;
};
export declare class HrbpPointRepository {
    private readonly database;
    constructor(database: DatabaseService);
    getEmployeeStatuses(): Promise<EmployeeStatusResponseDto[]>;
    employeeExists(persNo: string): Promise<boolean>;
    createEmployeeStatus(persNo: string, values: EmployeeStatusValues): Promise<EmployeeStatusResponseDto | null>;
    updateEmployeeStatus(persNo: string, values: EmployeeStatusValues): Promise<EmployeeStatusResponseDto | null>;
    deleteEmployeeStatus(persNo: string): Promise<boolean>;
}
export {};
