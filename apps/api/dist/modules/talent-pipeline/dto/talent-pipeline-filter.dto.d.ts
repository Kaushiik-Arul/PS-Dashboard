export declare class TalentPipelineFilterDto {
    functionName?: string | string[];
    orgUnit?: string | string[];
    range?: string | string[];
    location?: string | string[];
    gender?: string | string[];
    directOrIndirect?: string | string[];
}
export type NormalizedTalentPipelineFilters = {
    functionName: string[];
    orgUnit: string[];
    range: string[];
    location: string[];
    gender: string[];
    directOrIndirect: string[];
};
