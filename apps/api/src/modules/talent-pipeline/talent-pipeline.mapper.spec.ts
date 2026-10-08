import { mapTalentPipelineResponse } from './talent-pipeline.mapper';

function dashboard(workforceHeadcount?: number) {
  const result: Record<string, unknown> = {
    kpis: {
      as_of_date: '2026-01-31',
      total_talent_pool: { value: 12, percentage: null },
      active_talent_pool: { value: 8, percentage: 66.7 },
      passive_talent_pool: { value: 4, percentage: 33.3 },
      development_pool: { value: 6, percentage: null },
      female_talent: { value: 3, percentage: 50 },
      key_to_retain: { value: 2, percentage: 33.3 },
      future_talent: { value: 1, percentage: 16.7 },
      change_wanted: { value: 1, percentage: 16.7 },
      talent_pool_expiring: {
        within_6_months: 1,
        within_12_months: 2,
      },
    },
    charts: {
      nomination_year: 2026,
      talent_pool_distribution: { data: [] },
      active_passive_distribution: { data: [] },
      nomination_status_distribution: { data: [] },
      development_pool_distribution: { data: [] },
      talent_gender_distribution: { data: [] },
      talent_range_distribution: { data: [] },
    },
    filterOptions: {
      functionName: [],
      orgUnit: [],
      range: [],
      location: [],
      gender: [],
      directOrIndirect: [],
    },
  };
  if (workforceHeadcount !== undefined) {
    result.workforceHeadcount = workforceHeadcount;
  }
  return result;
}

describe('mapTalentPipelineResponse', () => {
  it('maps the scoped workforce headcount', () => {
    expect(mapTalentPipelineResponse(dashboard(120)).workforceHeadcount).toBe(120);
  });

  it('maps snapshots created before workforce headcount was added', () => {
    expect(mapTalentPipelineResponse(dashboard()).workforceHeadcount).toBeNull();
  });
});
