import type { ParsedRbinRow, RbinSourceValues } from './rbin-cleaning.types';
export type DetectedCareerEvent = {
    persNo: string;
    eventType: 'entry_to_ps' | 'internal_ps_change';
    oldOrganisationalAreaPa: string;
    newOrganisationalAreaPa: string;
    oldOrganizationalUnit: string;
    newOrganizationalUnit: string;
    oldPsGroup: string;
    newPsGroup: string;
};
export declare function detectCareerEvents(previousRows: readonly {
    values: RbinSourceValues;
}[], currentRows: readonly ParsedRbinRow[]): DetectedCareerEvent[];
