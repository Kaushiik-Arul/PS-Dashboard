export declare const employeeStatusTypes: readonly ["Maternity", "Sabbatical", "CRL", "Absconding"];
export type EmployeeStatusType = (typeof employeeStatusTypes)[number];
export declare class EmployeeStatusResponseDto {
    persNo: string;
    statusType: EmployeeStatusType;
    startDate: string | null;
    endDate: string | null;
    updatedAt: string;
    updatedBy: string;
}
export declare class CreateEmployeeStatusDto {
    persNo: string;
    statusType: EmployeeStatusType;
    startDate?: string | null;
    endDate?: string | null;
}
export declare class UpdateEmployeeStatusDto {
    statusType: EmployeeStatusType;
    startDate?: string | null;
    endDate?: string | null;
}
