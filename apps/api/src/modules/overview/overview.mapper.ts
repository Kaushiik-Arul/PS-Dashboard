import {
  ChartDatumDto,
  DistributionChartDto,
  KpiValueDto,
  OverviewResponseDto,
  RetirementRiskRowDto,
  WorkforceMovementDto,
} from './dto/overview-response.dto';

type JsonRecord = Record<string, unknown>;

function requireRecord(value: unknown, field: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Overview result contains an invalid ${field}`);
  }

  return value as JsonRecord;
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Overview result contains an invalid ${field}`);
  }

  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Overview result contains an invalid ${field}`);
  }

  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Overview result contains an invalid ${field}`);
  }

  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null) return null;
  return requireNumber(value, field);
}

function mapKpi(value: unknown, field: string): KpiValueDto {
  const source = requireRecord(value, field);
  const unit = source.unit;

  if (unit !== undefined && typeof unit !== 'string') {
    throw new Error(`Overview result contains an invalid ${field}.unit`);
  }

  return {
    value: nullableNumber(source.value, `${field}.value`),
    ...(unit ? { unit } : {}),
  };
}

function mapDistribution(value: unknown, field: string): DistributionChartDto {
  const source = requireRecord(value, field);
  const data = requireArray(source.data, `${field}.data`);

  return {
    data: data.map((item, index): ChartDatumDto => {
      const row = requireRecord(item, `${field}.data[${index}]`);

      return {
        label: requireString(row.label, `${field}.data[${index}].label`),
        value: requireNumber(
          row.headcount,
          `${field}.data[${index}].headcount`,
        ),
        percentage: nullableNumber(
          row.percentage,
          `${field}.data[${index}].percentage`,
        ),
      };
    }),
  };
}

function mapRetirementRisk(value: unknown): RetirementRiskRowDto[] {
  const source = requireRecord(value, 'charts.retirement_risk');
  const rows = requireArray(
    source.by_function,
    'charts.retirement_risk.by_function',
  );

  return rows.map((item, index) => {
    const row = requireRecord(
      item,
      `charts.retirement_risk.by_function[${index}]`,
    );

    return {
      functionName: requireString(
        row.label,
        `charts.retirement_risk.by_function[${index}].label`,
      ),
      oneYear: requireNumber(
        row.lt_1_year,
        `charts.retirement_risk.by_function[${index}].lt_1_year`,
      ),
      threeYears: requireNumber(
        row.lt_3_years,
        `charts.retirement_risk.by_function[${index}].lt_3_years`,
      ),
      fiveYears: requireNumber(
        row.lt_5_years,
        `charts.retirement_risk.by_function[${index}].lt_5_years`,
      ),
    };
  });
}

function mapWorkforceMovement(value: unknown): WorkforceMovementDto {
  const source = requireRecord(value, 'charts.workforce_movement');

  return {
    monthStart: requireString(
      source.month_start,
      'charts.workforce_movement.month_start',
    ),
    throughDate: requireString(
      source.through_date,
      'charts.workforce_movement.through_date',
    ),
    inbound: nullableNumber(
      source.inbound,
      'charts.workforce_movement.inbound',
    ),
    outbound: nullableNumber(
      source.outbound,
      'charts.workforce_movement.outbound',
    ),
    active: nullableNumber(
      source.active,
      'charts.workforce_movement.active',
    ),
  };
}

export function mapOverviewResponse(value: unknown): OverviewResponseDto {
  const dashboard = requireRecord(value, 'dashboard');
  const kpis = requireRecord(dashboard.kpis, 'kpis');
  const charts = requireRecord(dashboard.charts, 'charts');

  return {
    asOfDate: requireString(kpis.as_of_date, 'kpis.as_of_date'),
    kpis: {
      totalHeadcount: mapKpi(kpis.total_hc, 'kpis.total_hc'),
      directHeadcount: mapKpi(kpis.direct_hc, 'kpis.direct_hc'),
      indirectHeadcount: mapKpi(kpis.indirect_hc, 'kpis.indirect_hc'),
      femalePercentage: mapKpi(kpis.female_pct, 'kpis.female_pct'),
      averageAge: mapKpi(kpis.avg_age, 'kpis.avg_age'),
      averageTenure: mapKpi(kpis.avg_tenure, 'kpis.avg_tenure'),
      retirementWithinThreeYears: mapKpi(
        kpis.retirement_lt_3_years,
        'kpis.retirement_lt_3_years',
      ),
      maternity: mapKpi(kpis.maternity, 'kpis.maternity'),
      sabbatical: mapKpi(kpis.sabbatical, 'kpis.sabbatical'),
      crl: mapKpi(kpis.crl, 'kpis.crl'),
    },
    charts: {
      headcountByRange: mapDistribution(
        charts.headcount_by_range,
        'charts.headcount_by_range',
      ),
      genderDistribution: mapDistribution(
        charts.gender_distribution,
        'charts.gender_distribution',
      ),
      headcountByFunction: mapDistribution(
        charts.headcount_by_function,
        'charts.headcount_by_function',
      ),
      headcountByLocation: mapDistribution(
        charts.headcount_by_location,
        'charts.headcount_by_location',
      ),
      ageProfile: mapDistribution(
        charts.age_profile,
        'charts.age_profile',
      ),
      tenureProfile: mapDistribution(
        charts.tenure_profile,
        'charts.tenure_profile',
      ),
      retirementRisk: mapRetirementRisk(charts.retirement_risk),
      workforceMovement: mapWorkforceMovement(charts.workforce_movement),
    },
  };
}