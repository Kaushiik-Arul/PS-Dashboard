import { type CreateEmployeeStatusDto, type EmployeeStatusResponseDto, type UpdateEmployeeStatusDto } from './dto/employee-status.dto';
import { HrbpPointRepository } from './hrbp-point.repository';
export declare class HrbpPointService {
    private readonly repository;
    private readonly logger;
    constructor(repository: HrbpPointRepository);
    getEmployeeStatuses(): Promise<EmployeeStatusResponseDto[]>;
    createEmployeeStatus(input: CreateEmployeeStatusDto, actorAccountId: string): Promise<EmployeeStatusResponseDto>;
    updateEmployeeStatus(persNoInput: string, input: UpdateEmployeeStatusDto, actorAccountId: string): Promise<EmployeeStatusResponseDto>;
    deleteEmployeeStatus(persNoInput: string): Promise<void>;
    private validatePersNo;
    private validateValues;
    private validateDate;
    private runDatabaseOperation;
}
