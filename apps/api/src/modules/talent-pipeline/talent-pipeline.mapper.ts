import {
  TalentPipelineDistributionDto,
  TalentPipelineKpiValueDto,
  TalentPipelineResponseDto,
} from './dto/talent-pipeline-response.dto';

type JsonRecord = Record<string, unknown>;

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Talent Pipeline result contains an invalid ${field}`);
  return value as JsonRecord;
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value))
    throw new Error(`Talent Pipeline result contains an invalid ${field}`);
  return value;
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value)
    throw new Error(`Talent Pipeline result contains an invalid ${field}`);
  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Talent Pipeline result contains an invalid ${field}`);
  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  return value === null ? null : number(value, field);
}

function kpi(
  value: unknown,
  field: string,
  hasPercentage = false,
): TalentPipelineKpiValueDto {
  const source = record(value, field);
  return {
    value: number(source.value, `${field}.value`),
    percentage: hasPercentage
      ? nullableNumber(source.percentage, `${field}.percentage`)
      : null,
  };
}

function distribution(
  value: unknown,
  field: string,
): TalentPipelineDistributionDto {
  const source = record(value, field);
  return {
    data: array(source.data, `${field}.data`).map((item, index) => {
      const row = record(item, `${field}.data[${index}]`);
      return {
        label: string(row.label, `${field}.data[${index}].label`),
        value: number(row.headcount, `${field}.data[${index}].headcount`),
        percentage: nullableNumber(
          row.percentage,
          `${field}.data[${index}].percentage`,
        ),
      };
    }),
  };
}

function stringArray(value: unknown, field: string): string[] {
  return array(value, field).map((item, index) =>
    string(item, `${field}[${index}]`),
  );
}

export function mapTalentPipelineResponse(
  value: unknown,
): TalentPipelineResponseDto {
  const dashboard = record(value, 'dashboard');
  const kpis = record(dashboard.kpis, 'kpis');
  const charts = record(dashboard.charts, 'charts');
  const options = record(dashboard.filterOptions, 'filterOptions');
  const expiring = record(
    kpis.talent_pool_expiring,
    'kpis.talent_pool_expiring',
  );

  return {
    asOfDate: string(kpis.as_of_date, 'kpis.as_of_date'),
    kpis: {
      totalTalentPool: kpi(kpis.total_talent_pool, 'kpis.total_talent_pool'),
      activeTalentPool: kpi(
        kpis.active_talent_pool,
        'kpis.active_talent_pool',
        true,
      ),
      passiveTalentPool: kpi(
        kpis.passive_talent_pool,
        'kpis.passive_talent_pool',
        true,
      ),
      developmentPool: kpi(kpis.development_pool, 'kpis.development_pool'),
      femaleTalent: kpi(kpis.female_talent, 'kpis.female_talent', true),
      keyToRetain: kpi(kpis.key_to_retain, 'kpis.key_to_retain', true),
      futureTalent: kpi(kpis.future_talent, 'kpis.future_talent', true),
      changeWanted: kpi(kpis.change_wanted, 'kpis.change_wanted', true),
      talentPoolExpiring: {
        within6Months: number(
          expiring.within_6_months,
          'kpis.talent_pool_expiring.within_6_months',
        ),
        within12Months: number(
          expiring.within_12_months,
          'kpis.talent_pool_expiring.within_12_months',
        ),
      },
    },
    charts: {
      nominationYear: nullableNumber(
        charts.nomination_year,
        'charts.nomination_year',
      ),
      talentPoolDistribution: distribution(
        charts.talent_pool_distribution,
        'charts.talent_pool_distribution',
      ),
      activePassiveDistribution: distribution(
        charts.active_passive_distribution,
        'charts.active_passive_distribution',
      ),
      nominationStatusDistribution: distribution(
        charts.nomination_status_distribution,
        'charts.nomination_status_distribution',
      ),
      developmentPoolDistribution: distribution(
        charts.development_pool_distribution,
        'charts.development_pool_distribution',
      ),
      talentGenderDistribution: distribution(
        charts.talent_gender_distribution,
        'charts.talent_gender_distribution',
      ),
      talentRangeDistribution: distribution(
        charts.talent_range_distribution,
        'charts.talent_range_distribution',
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