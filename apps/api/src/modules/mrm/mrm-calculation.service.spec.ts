import { MrmCalculationRepository } from './mrm-calculation.repository';
import { MrmCalculationService } from './mrm-calculation.service';

describe('MrmCalculationService', () => {
  let repository: jest.Mocked<Pick<MrmCalculationRepository, 'getSourceStatus' | 'getEmployees' | 'getAttrition'>>;
  let service: MrmCalculationService;

  beforeEach(() => {
    repository = {
      getSourceStatus: jest.fn(),
      getEmployees: jest.fn(),
      getAttrition: jest.fn(),
    };
    service = new MrmCalculationService(repository as MrmCalculationRepository);
  });

  it('returns unavailable without inventing zero metrics', async () => {
    repository.getSourceStatus.mockResolvedValue({ available: false, source: null });

    await expect(service.calculate('2026-01', 'account')).resolves.toEqual({
      sourceStatus: { available: false, source: null },
      buckets: [],
    });
    expect(repository.getEmployees).not.toHaveBeenCalled();
  });

  it('creates normalized dimensional buckets for workforce and attrition metrics', async () => {
    repository.getSourceStatus.mockResolvedValue({ available: true, source: 'history' });
    repository.getEmployees.mockResolvedValue([
      {
        range: ' bidp ', org_unit: 'Unit  A', direct_or_indirect: 'I',
        employee_group: 'INBOUND', ps_group: 'SL2', gender_key: 'Female', joined_in_month: true,
      },
      {
        range: 'BIDP', org_unit: 'Unit A', direct_or_indirect: 'D',
        employee_group: '', ps_group: 'GROUP1', gender_key: 'Male', joined_in_month: true,
      },
      {
        range: 'BIDP', org_unit: 'Unit A', direct_or_indirect: 'D',
        employee_group: '', ps_group: '', gender_key: '', joined_in_month: true,
      },
    ]);
    repository.getAttrition.mockResolvedValue([
      { range: 'BIDP', org_unit: 'Unit A', filter_value: 'Exit', reason_for_action: 'Resignation' },
      { range: 'BIDP', org_unit: 'Unit A', filter_value: 'Transfer', reason_for_action: 'TRANSFER INTRA BOSCH' },
      { range: 'BIDP', org_unit: 'Unit A', filter_value: '', reason_for_action: 'INTERNAL' },
    ]);

    const result = await service.calculate('2026-01', 'account');
    const buckets = new Map(result.buckets.map((bucket) => [bucket.metricKey, bucket]));

    expect(buckets.get('indirect-mss')).toMatchObject({ rangeKey: 'BIDP', orgUnitKey: 'UNIT A', numerator: 1 });
    expect(buckets.get('direct-mss')?.numerator).toBe(2);
    expect(buckets.get('total-mss')?.numerator).toBe(3);
    expect(buckets.get('expat')?.numerator).toBe(1);
    expect(buckets.get('sul')?.numerator).toBe(2);
    expect(buckets.get('women-slx')?.numerator).toBe(1);
    expect(buckets.get('women-hc')).toMatchObject({ numerator: 1, denominator: 3 });
    expect(buckets.get('gender-hiring')).toMatchObject({ numerator: 1, denominator: 2, qualityCount: 1 });
    expect(buckets.get('attrition')?.numerator).toBe(1);
    expect(buckets.get('rotation')?.numerator).toBe(1);
    expect(buckets.get('transfer')?.numerator).toBe(1);
  });
});