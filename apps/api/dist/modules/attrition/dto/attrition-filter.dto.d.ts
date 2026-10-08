export declare class AttritionFilterDto {
    year?: string;
    separationType?: string;
    orgUnit?: string;
    range?: string;
}
export type NormalizedAttritionFilters = {
    year: number;
    separationType: string | null;
    orgUnit: string | null;
    range: string | null;
};
