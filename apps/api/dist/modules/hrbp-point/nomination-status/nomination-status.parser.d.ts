import { type NominationStatusFile, type NominationStatusIssue, type NominationStatusRow, type NominationStatusValues } from './nomination-status.types';
export declare function cleanNominationStatusValues(input: unknown): NominationStatusValues;
export declare function validateNominationStatusRow(values: NominationStatusValues): NominationStatusIssue[];
export declare function parseNominationStatusFile(file: NominationStatusFile): Promise<NominationStatusRow[]>;
