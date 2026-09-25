export declare class Employee360QueryDto {
    search?: string;
    functionName?: string;
    orgUnit?: string;
    range?: string;
    location?: string;
    gender?: string;
    directOrIndirect?: string;
}
export type NormalizedEmployee360Query = {
    search: string | null;
    functionName: string | null;
    orgUnit: string | null;
    range: string | null;
    location: string | null;
    gender: string | null;
    directOrIndirect: string | null;
};
export declare class Employee360RowDto {
    persNo: string;
    personnelNumber: string | null;
    employeeGroup: string | null;
    psGroup: string | null;
    orgUnit: string | null;
    range: string | null;
    functionName: string | null;
    gender: string | null;
    location: string | null;
    ntId: string | null;
    globalId: string | null;
    costCenter: string | null;
    birthDate: string | null;
    joiningDate: string | null;
    entryForRetirement: string | null;
    designationText: string | null;
    hrbpGlobalId: string | null;
    hrbp2GlobalId: string | null;
    officialEmail: string | null;
    technicalEntryDate: string | null;
    directOrIndirect: string | null;
}
export declare class Employee360FilterOptionsDto {
    functionName: string[];
    orgUnit: string[];
    range: string[];
    location: string[];
    gender: string[];
    directOrIndirect: string[];
}
export declare class Employee360ResponseDto {
    employees: Employee360RowDto[];
    filterOptions: Employee360FilterOptionsDto;
}
export declare class EmployeePppHistoryDto {
    year: number;
    performance: string | null;
    position: string | null;
    person: string | null;
    tcl: string | null;
}
export declare class Employee360ProfileResponseDto {
    employee: Employee360RowDto;
    careerJourney: unknown[];
    pppHistory: EmployeePppHistoryDto[];
}
