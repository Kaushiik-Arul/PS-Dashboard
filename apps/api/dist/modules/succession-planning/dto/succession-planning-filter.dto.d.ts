export declare class SuccessionPlanningFilterDto {
    functionName?: string | string[];
    orgUnit?: string | string[];
    range?: string | string[];
    location?: string | string[];
    gender?: string | string[];
    directOrIndirect?: string | string[];
}
export type NormalizedSuccessionPlanningFilters = {
    functionName: string[];
    orgUnit: string[];
    range: string[];
    location: string[];
    gender: string[];
    directOrIndirect: string[];
};
