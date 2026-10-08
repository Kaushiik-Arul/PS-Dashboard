export type HeadcountImportIssue = {
  sheetName: string;
  message: string;
  rowNumber?: number;
  column?: "pers_no" | "range" | "org_unit";
};

export type HeadcountRangeCount = {
  rangeKey: string;
  rangeName: string;
  headcount: number;
};

export type HeadcountOrgUnitCount = {
  orgUnitKey: string;
  orgUnitName: string;
  headcount: number;
};

export type HeadcountRangeOrgUnitCount = {
  rangeKey: string;
  rangeName: string;
  orgUnitKey: string;
  orgUnitName: string;
  headcount: number;
};

export type HeadcountMonthPreview = {
  sheetName: string;
  reportingMonth: string;
  totalHeadcount: number;
  existingTotalHeadcount: number | null;
  ranges: HeadcountRangeCount[];
  orgUnits: HeadcountOrgUnitCount[];
  rangeOrgUnits: HeadcountRangeOrgUnitCount[];
};

export type HeadcountPreview = {
  id: string;
  fileName: string;
  includedSheets: string[];
  ignoredSheets: string[];
  months: HeadcountMonthPreview[];
  issues: HeadcountImportIssue[];
  expiresAt: string;
};

export type HeadcountCommitResult = {
  importedMonths: number;
  replacedMonths: number;
};