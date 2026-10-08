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
  jdId: string | null;
  jdName: string | null;
};

export type Employee360Response = {
  employees: Employee360Row[];
  filterOptions: OverviewFilterOptions;
};

export type CareerJourneyEvent = {
  id: string;
  persNo: string;
  eventMonth: string;
  eventType: "entry_to_ps" | "internal_ps_change" | "manual" | "job_description_change";
  oldOrganisationalAreaPa: string | null;
  newOrganisationalAreaPa: string | null;
  oldOrganizationalUnit: string | null;
  newOrganizationalUnit: string | null;
  oldPsGroup: string | null;
  newPsGroup: string | null;
  source: "rbin" | "manual" | "upload";
  oldJdId: string | null;
  oldJdName: string | null;
  newJdId: string | null;
  newJdName: string | null;
  readOnly: boolean;
  notes: string | null;
  isReviewed: boolean;
  updatedAt: string;
  updatedBy: string;
};

export type CareerJourneyInput = Pick<CareerJourneyEvent,
  "eventMonth" | "oldOrganisationalAreaPa" | "newOrganisationalAreaPa"
  | "oldOrganizationalUnit" | "newOrganizationalUnit" | "oldPsGroup" | "newPsGroup" | "notes">;

export type EmployeePppHistory = {
  year: number;
  performance: string | null;
  position: string | null;
  person: string | null;
  tcl: string | null;
};

export type EmployeeStepAvailability = {
  available: boolean;
  preferences: string | null;
  comments: string | null;
};

export type EmployeeStepOverview = {
  active: {
    year: number;
    departmentFrom: string | null;
    departmentTo: string | null;
    exchangedWith: string | null;
    stepPeriodFrom: string | null;
    stepPeriodTo: string | null;
  } | null;
  availability: EmployeeStepAvailability;
};

export type EmployeeIdpStatus = {
  available: boolean;
  comments: string | null;
};

export type EmployeeTalentPortfolioEntry = {
  type: string;
  startDate: string | null;
  endDateOrAdmission: string;
};

export type EmployeeTalentPortfolio = {
  active: EmployeeTalentPortfolioEntry | null;
  passive: EmployeeTalentPortfolioEntry | null;
  nomination: EmployeeTalentPortfolioEntry | null;
};

export type EmployeeDevelopmentPortfolio = {
  developmentPool: string;
  poolStartDate: string;
  poolEndDate: string;
};

export type EmployeeSuccessionPortfolioEntry = {
  jdId: string;
  jdName: string;
};

export type EmployeeSuccessionPortfolio = {
  successor1: EmployeeSuccessionPortfolioEntry | null;
  successor2: EmployeeSuccessionPortfolioEntry | null;
};

export type Employee360Profile = {
  employee: Employee360Row;
  careerJourney: CareerJourneyEvent[];
  pppHistory: EmployeePppHistory[];
  stepOverview: EmployeeStepOverview;
  idpStatus: EmployeeIdpStatus;
  talentPortfolio: EmployeeTalentPortfolio;
  developmentPortfolio: EmployeeDevelopmentPortfolio | null;
  successionPortfolio: EmployeeSuccessionPortfolio;
};