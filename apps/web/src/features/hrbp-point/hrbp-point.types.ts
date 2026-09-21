export const employeeStatusTypes = [
  "Maternity",
  "Sabbatical",
  "CRL",
  "Absconding",
] as const;

export type EmployeeStatusType = (typeof employeeStatusTypes)[number];

export interface EmployeeStatus {
  persNo: string;
  statusType: EmployeeStatusType;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface EmployeeStatusInput {
  statusType: EmployeeStatusType;
  startDate: string | null;
  endDate: string | null;
}

export interface CreateEmployeeStatusInput extends EmployeeStatusInput {
  persNo: string;
}