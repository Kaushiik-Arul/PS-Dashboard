import { EmployeeJdMovementsRepository } from './employee-jd-movements.repository';
export declare class EmployeeJdMovementsService {
    private readonly repository;
    constructor(repository: EmployeeJdMovementsRepository);
    list(search?: string, source?: string, fromDate?: string, toDate?: string, role?: string, pageInput?: string, pageSizeInput?: string): Promise<import("./employee-jd-movements.types").EmployeeJdMovementPage>;
    private date;
    private positiveInteger;
}
