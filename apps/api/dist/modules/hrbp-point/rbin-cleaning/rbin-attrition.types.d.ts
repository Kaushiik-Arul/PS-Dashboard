import type { RbinSourceValues } from './rbin-cleaning.types';
export type AttritionRangeType = 'plant' | 'corporate';
export type WithinPsType = 'plant_to_plant' | 'plant_to_corp' | 'corp_to_corp' | 'corp_to_plant' | 'unclassified';
export type AttritionCleanedRow = {
    persNo: string;
    organizationalUnit: string;
    range: string;
};
export type DetectedAttritionEvent = {
    persNo: string;
    eventType: 'transfer';
    transferType: 'out_of_ps_within_rbin' | 'within_ps';
    withinPsType: WithinPsType | null;
    countsAsPsAttrition: boolean;
    classificationStatus: 'confirmed' | 'pending_range';
    oldOrganisationalAreaPa: string;
    newOrganisationalAreaPa: string;
    oldOrganizationalUnit: string;
    newOrganizationalUnit: string;
    oldRange: string | null;
    newRange: string | null;
    oldRangeType: AttritionRangeType | null;
    newRangeType: AttritionRangeType | null;
};
export type DetectedDepartureCandidate = {
    persNo: string;
    previousOrganisationalAreaPa: string;
    previousOrganizationalUnit: string;
    previousRange: string | null;
    previousRangeType: AttritionRangeType | null;
};
export type AttritionDetectionResult = {
    events: DetectedAttritionEvent[];
    departureCandidates: DetectedDepartureCandidate[];
    reappearedPersNos: string[];
};
export type UniqueRbinRows = ReadonlyMap<string, RbinSourceValues>;
