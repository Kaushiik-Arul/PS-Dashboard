export declare class AttritionFilterDto {
    year?: string | string[];
    separationType?: string | string[];
    orgUnit?: string | string[];
    range?: string | string[];
}
export type NormalizedAttritionFilters = {
    years: number[];
    separationTypes: string[];
    orgUnits: string[];
    ranges: string[];
};
