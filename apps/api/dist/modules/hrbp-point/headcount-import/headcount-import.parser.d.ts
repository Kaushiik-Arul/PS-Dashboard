import type { ParsedHeadcountWorkbook, UploadedHeadcountFile } from './headcount-import.types';
export declare function parseHeadcountWorkbook(file: UploadedHeadcountFile): Promise<ParsedHeadcountWorkbook>;
