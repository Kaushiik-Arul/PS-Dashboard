import { CreateEmployeeStatusDto, EmployeeStatusResponseDto, UpdateEmployeeStatusDto } from './dto/employee-status.dto';
import { HrbpPointService } from './hrbp-point.service';
export declare class HrbpPointController {
    private readonly service;
    constructor(service: HrbpPointService);
    getEmployeeStatuses(): Promise<EmployeeStatusResponseDto[]>;
    createEmployeeStatus(input: CreateEmployeeStatusDto): Promise<EmployeeStatusResponseDto>;
    updateEmployeeStatus(persNo: string, input: UpdateEmployeeStatusDto): Promise<EmployeeStatusResponseDto>;
    deleteEmployeeStatus(persNo: string): Promise<void>;
}
