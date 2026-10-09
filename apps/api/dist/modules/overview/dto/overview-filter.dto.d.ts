export declare const overviewDetailMetrics: readonly ["total-hc", "direct-hc", "indirect-hc", "female-pct", "avg-age", "avg-tenure", "ret-3yrs", "maternity", "sabbatical", "crl"];
export type OverviewDetailMetric = (typeof overviewDetailMetrics)[number];
export declare class OverviewFilterDto {
    reportingMonth?: string;
    functionName?: string | string[];
    orgUnit?: string | string[];
    range?: string | string[];
    location?: string | string[];
    gender?: string | string[];
    directOrIndirect?: string | string[];
}
export declare class OverviewDetailsFilterDto extends OverviewFilterDto {
    metric: string;
}
export type NormalizedOverviewFilters = {
    reportingMonth: string | null;
    functionName: string[];
    orgUnit: string[];
    range: string[];
    location: string[];
    gender: string[];
    directOrIndirect: string[];
};
