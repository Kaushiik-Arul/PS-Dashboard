import { EmployeeJdMovementsService } from './employee-jd-movements.service';
export declare class EmployeeJdMovementsController {
    private readonly service;
    constructor(service: EmployeeJdMovementsService);
    list(search?: string, source?: string, fromDate?: string, toDate?: string, role?: string, page?: string, pageSize?: string): Promise<import("./employee-jd-movements.types").EmployeeJdMovementPage>;
}
