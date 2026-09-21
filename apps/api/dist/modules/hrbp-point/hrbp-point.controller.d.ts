import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateEmployeeStatusDto, EmployeeStatusResponseDto, UpdateEmployeeStatusDto } from './dto/employee-status.dto';
import { HrbpPointService } from './hrbp-point.service';
export declare class HrbpPointController {
    private readonly service;
    constructor(service: HrbpPointService);
    getEmployeeStatuses(): Promise<EmployeeStatusResponseDto[]>;
    createEmployeeStatus(input: CreateEmployeeStatusDto, user: AuthenticatedUser): Promise<EmployeeStatusResponseDto>;
    updateEmployeeStatus(persNo: string, input: UpdateEmployeeStatusDto, user: AuthenticatedUser): Promise<EmployeeStatusResponseDto>;
    deleteEmployeeStatus(persNo: string): Promise<void>;
}
