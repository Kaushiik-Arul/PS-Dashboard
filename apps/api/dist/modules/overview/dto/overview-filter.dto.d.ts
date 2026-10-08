export declare const overviewDetailMetrics: readonly ["total-hc", "direct-hc", "indirect-hc", "female-pct", "avg-age", "avg-tenure", "ret-3yrs", "maternity", "sabbatical", "crl"];
export type OverviewDetailMetric = (typeof overviewDetailMetrics)[number];
export declare class OverviewFilterDto {
    reportingMonth?: string;
    functionName?: string;
    orgUnit?: string;
    range?: string;
    location?: string;
    gender?: string;
    directOrIndirect?: string;
}
export declare class OverviewDetailsFilterDto extends OverviewFilterDto {
    metric: string;
}
export type NormalizedOverviewFilters = {
    reportingMonth: string | null;
    functionName: string | null;
    orgUnit: string | null;
    range: string | null;
    location: string | null;
    gender: string | null;
    directOrIndirect: string | null;
};
