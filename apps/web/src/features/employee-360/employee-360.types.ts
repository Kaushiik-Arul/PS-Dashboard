import type { OverviewFilterOptions, OverviewQueryFilters } from "@/features/overview/overview.types";

export type Employee360Query = OverviewQueryFilters & { search?: string };

export type Employee360Row = {
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
};

export type Employee360Response = {
  employees: Employee360Row[];
  filterOptions: OverviewFilterOptions;
};