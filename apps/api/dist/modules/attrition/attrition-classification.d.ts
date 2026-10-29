export declare const separationTypes: readonly ["Resignation", "Transfer", "Retirement", "Other"];
export type SeparationType = (typeof separationTypes)[number];
export type AttritionClassificationInput = {
    filter_value: string;
    reason_for_action: string;
};
export declare function normalizedKey(value: string): string;
export declare function classifySeparation(row: AttritionClassificationInput): SeparationType;
