import 'server-only';
import { getSessionHeaders } from '@/auth/server-session';
import type {
  TalentPipelineDistribution,
  TalentPipelineFilterOptions,
  TalentPipelineKpiValue,
  TalentPipelineQueryFilters,
  TalentPipelineResponse,
} from './talent-pipeline.types';

type JsonRecord = Record<string, unknown>;

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Talent Pipeline API returned an invalid ${field}`);
  return value as JsonRecord;
}

function number(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Talent Pipeline API returned an invalid ${field}`);
  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  return value === null ? null : number(value, field);
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value)
    throw new Error(`Talent Pipeline API returned an invalid ${field}`);
  return value;
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value))
    throw new Error(`Talent Pipeline API returned an invalid ${field}`);
  return value.map((item, index) => string(item, `${field}[${index}]`));
}

function kpi(value: unknown, field: string): TalentPipelineKpiValue {
  const source = record(value, field);
  return {
    value: number(source.value, `${field}.value`),
    percentage: nullableNumber(source.percentage, `${field}.percentage`),
  };
}

function distribution(
  value: unknown,
  field: string,
): TalentPipelineDistribution {
  const source = record(value, field);
  if (!Array.isArray(source.data))
    throw new Error(`Talent Pipeline API returned an invalid ${field}.data`);
  return {
    data: source.data.map((item, index) => {
      const row = record(item, `${field}.data[${index}]`);
      return {
        label: string(row.label, `${field}.data[${index}].label`),
        value: number(row.value, `${field}.data[${index}].value`),
        percentage: nullableNumber(
          row.percentage,
          `${field}.data[${index}].percentage`,
        ),
      };
    }),
  };
}

function parseResponse(value: unknown): TalentPipelineResponse {
  const response = record(value, 'response');
  const kpis = record(response.kpis, 'kpis');
  const charts = record(response.charts, 'charts');
  const expiring = record(kpis.talentPoolExpiring, 'kpis.talentPoolExpiring');
  const options = record(response.filterOptions, 'filterOptions');
  return {
    asOfDate: string(response.asOfDate, 'asOfDate'),
    kpis: {
      totalTalentPool: kpi(kpis.totalTalentPool, 'kpis.totalTalentPool'),
      activeTalentPool: kpi(kpis.activeTalentPool, 'kpis.activeTalentPool'),
      passiveTalentPool: kpi(kpis.passiveTalentPool, 'kpis.passiveTalentPool'),
      developmentPool: kpi(kpis.developmentPool, 'kpis.developmentPool'),
      femaleTalent: kpi(kpis.femaleTalent, 'kpis.femaleTalent'),
      keyToRetain: kpi(kpis.keyToRetain, 'kpis.keyToRetain'),
      futureTalent: kpi(kpis.futureTalent, 'kpis.futureTalent'),
      changeWanted: kpi(kpis.changeWanted, 'kpis.changeWanted'),
      talentPoolExpiring: {
        within6Months: number(
          expiring.within6Months,
          'kpis.talentPoolExpiring.within6Months',
        ),
        within12Months: number(
          expiring.within12Months,
          'kpis.talentPoolExpiring.within12Months',
        ),
      },
    },
    charts: {
      nominationYear: nullableNumber(charts.nominationYear, 'charts.nominationYear'),
      talentPoolDistribution: distribution(
        charts.talentPoolDistribution,
        'charts.talentPoolDistribution',
      ),
      activePassiveDistribution: distribution(
        charts.activePassiveDistribution,
        'charts.activePassiveDistribution',
      ),
      nominationStatusDistribution: distribution(
        charts.nominationStatusDistribution,
        'charts.nominationStatusDistribution',
      ),
      developmentPoolDistribution: distribution(
        charts.developmentPoolDistribution,
        'charts.developmentPoolDistribution',
      ),
      talentGenderDistribution: distribution(
        charts.talentGenderDistribution,
        'charts.talentGenderDistribution',
      ),
      talentRangeDistribution: distribution(
        charts.talentRangeDistribution,
        'charts.talentRangeDistribution',
      ),
    },
    filterOptions: {
      functionName: stringArray(options.functionName, 'filterOptions.functionName'),
      orgUnit: stringArray(options.orgUnit, 'filterOptions.orgUnit'),
      range: stringArray(options.range, 'filterOptions.range'),
      location: stringArray(options.location, 'filterOptions.location'),
      gender: stringArray(options.gender, 'filterOptions.gender'),
      directOrIndirect: stringArray(
        options.directOrIndirect,
        'filterOptions.directOrIndirect',
      ),
    },
  };
}

export async function getTalentPipeline(
  filters: TalentPipelineQueryFilters = {},
): Promise<TalentPipelineResponse> {
  const configured = process.env.API_BASE_URL?.trim();
  if (!configured && process.env.NODE_ENV === 'production')
    throw new Error('API_BASE_URL is required in production');
  const base = configured
    ? new URL(configured).toString().replace(/\/$/, '')
    : 'http://127.0.0.1:3001/api/v1';
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.size ? `?${searchParams}` : '';
  const response = await fetch(`${base}/talent-pipeline${query}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json', ...(await getSessionHeaders()) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`Talent Pipeline API failed with status ${response.status}`);
  return parseResponse(await response.json());
}

export type { TalentPipelineFilterOptions };