export type UploadedHeadcountFile = {
    originalname: string;
    buffer: Buffer;
};
export type HeadcountImportIssue = {
    sheetName: string;
    message: string;
    rowNumber?: number;
    column?: 'pers_no' | 'range';
};
export type HeadcountRangeCount = {
    rangeKey: string;
    rangeName: string;
    headcount: number;
};
export type HeadcountMonthCalculation = {
    sheetName: string;
    reportingMonth: string;
    totalHeadcount: number;
    ranges: HeadcountRangeCount[];
};
export type ParsedHeadcountWorkbook = {
    includedSheets: string[];
    ignoredSheets: string[];
    months: HeadcountMonthCalculation[];
    issues: HeadcountImportIssue[];
};
export type HeadcountMonthPreview = HeadcountMonthCalculation & {
    existingTotalHeadcount: number | null;
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
