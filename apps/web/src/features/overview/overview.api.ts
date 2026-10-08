import "server-only";
import { getSessionHeaders } from "@/auth/server-session";
import type {
  KpiValue,
  OverviewDistributionChart,
  OverviewAvailableMonths,
  OverviewDetailMetric,
  OverviewEmployeeDetail,
  OverviewQueryFilters,
  OverviewResponse,
  RetirementRiskRow,
} from "./overview.types";

type JsonRecord = Record<string, unknown>;

function requireRecord(value: unknown, field: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Overview API returned an invalid ${field}`);
  }

  return value as JsonRecord;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Overview API returned an invalid ${field}`);
  }

  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Overview API returned an invalid ${field}`);
  }

  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null) return null;
  return requireNumber(value, field);
}

function parseKpi(value: unknown, field: string): KpiValue {
  const source = requireRecord(value, field);
  const unit = source.unit;

  if (unit !== undefined && typeof unit !== "string") {
    throw new Error(`Overview API returned an invalid ${field}.unit`);
  }

  return {
    value: nullableNumber(source.value, `${field}.value`),
    ...(unit ? { unit } : {}),
  };
}

function parseDistribution(
  value: unknown,
  field: string,
): OverviewDistributionChart {
  const source = requireRecord(value, field);

  if (!Array.isArray(source.data)) {
    throw new Error(`Overview API returned an invalid ${field}.data`);
  }

  return {
    data: source.data.map((item, index) => {
      const row = requireRecord(item, `${field}.data[${index}]`);

      return {
        label: requireString(row.label, `${field}.data[${index}].label`),
        value: requireNumber(row.value, `${field}.data[${index}].value`),
        percentage: nullableNumber(
          row.percentage,
          `${field}.data[${index}].percentage`,
        ),
      };
    }),
  };
}

function parseRetirementRisk(value: unknown): RetirementRiskRow[] {
  if (!Array.isArray(value)) {
    throw new Error("Overview API returned invalid retirement risk data");
  }

  return value.map((item, index) => {
    const row = requireRecord(item, `charts.retirementRisk[${index}]`);

    return {
      functionName: requireString(
        row.functionName,
        `charts.retirementRisk[${index}].functionName`,
      ),
      oneYear: requireNumber(
        row.oneYear,
        `charts.retirementRisk[${index}].oneYear`,
      ),
      threeYears: requireNumber(
        row.threeYears,
        `charts.retirementRisk[${index}].threeYears`,
      ),
      fiveYears: requireNumber(
        row.fiveYears,
        `charts.retirementRisk[${index}].fiveYears`,
      ),
    };
  });
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Overview API returned an invalid ${field}`);
  }
  return value.map((item, index) =>
    requireString(item, `${field}[${index}]`),
  );
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requireString(value, field);
}

function parseOverviewEmployeeDetails(value: unknown): OverviewEmployeeDetail[] {
  if (!Array.isArray(value)) {
    throw new Error("Overview API returned invalid employee details");
  }
  return value.map((item, index) => {
    const row = requireRecord(item, `details[${index}]`);
    return {
      personnelNumber: requireString(row.personnelNumber, `details[${index}].personnelNumber`),
      functionName: nullableString(row.functionName, `details[${index}].functionName`),
      orgUnit: nullableString(row.orgUnit, `details[${index}].orgUnit`),
      range: nullableString(row.range, `details[${index}].range`),
      location: nullableString(row.location, `details[${index}].location`),
      gender: nullableString(row.gender, `details[${index}].gender`),
      directOrIndirect: nullableString(row.directOrIndirect, `details[${index}].directOrIndirect`),
      ageYears: nullableNumber(row.ageYears, `details[${index}].ageYears`),
      tenureYears: nullableNumber(row.tenureYears, `details[${index}].tenureYears`),
      retirementDate: nullableString(row.retirementDate, `details[${index}].retirementDate`),
    };
  });
}

function parseOverviewResponse(value: unknown): OverviewResponse {
  const response = requireRecord(value, "response");
  const kpis = requireRecord(response.kpis, "kpis");
  const charts = requireRecord(response.charts, "charts");
  const filterOptions = requireRecord(response.filterOptions, "filterOptions");

  return {
    asOfDate: requireString(response.asOfDate, "asOfDate"),
    kpis: {
      totalHeadcount: parseKpi(kpis.totalHeadcount, "kpis.totalHeadcount"),
      directHeadcount: parseKpi(kpis.directHeadcount, "kpis.directHeadcount"),
      indirectHeadcount: parseKpi(
        kpis.indirectHeadcount,
        "kpis.indirectHeadcount",
      ),
      femalePercentage: parseKpi(
        kpis.femalePercentage,
        "kpis.femalePercentage",
      ),
      averageAge: parseKpi(kpis.averageAge, "kpis.averageAge"),
      averageTenure: parseKpi(kpis.averageTenure, "kpis.averageTenure"),
      retirementWithinThreeYears: parseKpi(
        kpis.retirementWithinThreeYears,
        "kpis.retirementWithinThreeYears",
      ),
      maternity: parseKpi(kpis.maternity, "kpis.maternity"),
      sabbatical: parseKpi(kpis.sabbatical, "kpis.sabbatical"),
      crl: parseKpi(kpis.crl, "kpis.crl"),
    },
    charts: {
      headcountByPsGroup: parseDistribution(
        charts.headcountByPsGroup,
        "charts.headcountByPsGroup",
      ),
      genderDistribution: parseDistribution(
        charts.genderDistribution,
        "charts.genderDistribution",
      ),
      headcountByFunction: parseDistribution(
        charts.headcountByFunction,
        "charts.headcountByFunction",
      ),
      headcountByLocation: parseDistribution(
        charts.headcountByLocation,
        "charts.headcountByLocation",
      ),
      ageProfile: parseDistribution(charts.ageProfile, "charts.ageProfile"),
      tenureProfile: parseDistribution(
        charts.tenureProfile,
        "charts.tenureProfile",
      ),
      retirementRisk: parseRetirementRisk(charts.retirementRisk),
      workforceMovement: parseDistribution(
        charts.workforceMovement,
        "charts.workforceMovement",
      ),
    },
    filterOptions: {
      functionName: parseStringArray(filterOptions.functionName, "filterOptions.functionName"),
      orgUnit: parseStringArray(filterOptions.orgUnit, "filterOptions.orgUnit"),
      range: parseStringArray(filterOptions.range, "filterOptions.range"),
      location: parseStringArray(filterOptions.location, "filterOptions.location"),
      gender: parseStringArray(filterOptions.gender, "filterOptions.gender"),
      directOrIndirect: parseStringArray(
        filterOptions.directOrIndirect,
        "filterOptions.directOrIndirect",
      ),
    },
  };
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.API_BASE_URL?.trim();

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("API_BASE_URL is required in production");
    }

    return "http://127.0.0.1:3001/api/v1";
  }

  const url = new URL(configuredUrl);

  if (url.username || url.password) {
    throw new Error("API_BASE_URL must not contain credentials");
  }

  return url.toString().replace(/\/$/, "");
}

export async function getOverview(
  filters: OverviewQueryFilters = {},
): Promise<OverviewResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  const sessionHeaders = await getSessionHeaders();
  const response = await fetch(`${getApiBaseUrl()}/overview${query}`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...sessionHeaders },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Overview API request failed with status ${response.status}`);
  }

  return parseOverviewResponse(await response.json());
}

export async function getOverviewDetails(
  metric: OverviewDetailMetric,
  filters: OverviewQueryFilters = {},
): Promise<OverviewEmployeeDetail[]> {
  const searchParams = new URLSearchParams({ metric });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const response = await fetch(`${getApiBaseUrl()}/overview/details?${searchParams}`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(await getSessionHeaders()) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Overview details request failed with status ${response.status}`);
  }
  return parseOverviewEmployeeDetails(await response.json());
}

export async function getOverviewAvailableMonths(): Promise<OverviewAvailableMonths> {
  const sessionHeaders = await getSessionHeaders();
  const response = await fetch(`${getApiBaseUrl()}/overview/available-months`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...sessionHeaders },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Overview available months request failed with status ${response.status}`);
  }

  const value = requireRecord(await response.json(), "available months");
  const currentMonth = value.currentMonth;
  const detailedMonths = value.detailedMonths;
  if ((currentMonth !== null && (typeof currentMonth !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(currentMonth)))
    || !Array.isArray(detailedMonths)
    || detailedMonths.some((month) => typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))) {
    throw new Error("Overview API returned invalid available months");
  }
  return { currentMonth: currentMonth as string | null, detailedMonths: detailedMonths as string[] };
}

export async function getOverviewArchivedMonths(): Promise<string[]> {
  const sessionHeaders = await getSessionHeaders();
  const response = await fetch(`${getApiBaseUrl()}/overview/archived-months`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...sessionHeaders },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Overview archived months request failed with status ${response.status}`);
  const months = await response.json() as unknown;
  if (!Array.isArray(months) || months.some((month) => typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))) {
    throw new Error("Overview API returned invalid archived months");
  }
  return months;
}

export async function getArchivedOverview(reportingMonth: string): Promise<OverviewResponse> {
  const sessionHeaders = await getSessionHeaders();
  const response = await fetch(`${getApiBaseUrl()}/overview/archive/${encodeURIComponent(reportingMonth)}`, {
    cache: "no-store",
    headers: { Accept: "application/json", ...sessionHeaders },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Archived Overview request failed with status ${response.status}`);
  return parseOverviewResponse(await response.json());
}