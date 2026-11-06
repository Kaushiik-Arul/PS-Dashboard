import { MrmCalculationRepository } from './mrm-calculation.repository';
import { MrmCalculationService } from './mrm-calculation.service';

describe('MrmCalculationService', () => {
  let repository: jest.Mocked<Pick<
    MrmCalculationRepository,
    'getSourceStatus' | 'getEmployees' | 'getAttrition'
    | 'getSnapshotBuckets' | 'replaceMonthlySnapshot'
  >>;
  let service: MrmCalculationService;

  beforeEach(() => {
    repository = {
      getSourceStatus: jest.fn(),
      getEmployees: jest.fn(),
      getAttrition: jest.fn(),
      getSnapshotBuckets: jest.fn(),
      replaceMonthlySnapshot: jest.fn(),
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

  it('reads preserved buckets after detailed source retention', async () => {
    repository.getSourceStatus.mockResolvedValue({ available: true, source: 'snapshot' });
    repository.getSnapshotBuckets.mockResolvedValue([{
      dataMonth: '2026-01', metricKey: 'total-mss', rangeKey: '', orgUnitKey: '',
      numerator: 10, denominator: null, qualityCount: 0,
    }]);

    const result = await service.calculate('2026-01', 'account');

    expect(result.buckets).toHaveLength(1);
    expect(repository.getSnapshotBuckets).toHaveBeenCalledWith('2026-01', 'account', undefined);
    expect(repository.getEmployees).not.toHaveBeenCalled();
  });

  it('archives calculated buckets before detailed source deletion', async () => {
    const executor = { query: jest.fn() };
    repository.getSourceStatus.mockResolvedValue({ available: true, source: 'history' });
    repository.getEmployees.mockResolvedValue([]);
    repository.getAttrition.mockResolvedValue([]);

    await service.archiveMonth('2026-01', 'account', executor as never);

    expect(repository.replaceMonthlySnapshot).toHaveBeenCalledWith(
      '2026-01', 'account', [], executor,
    );
  });

  it('creates normalized dimensional buckets for workforce and attrition metrics', async () => {
    repository.getSourceStatus.mockResolvedValue({ available: true, source: 'history' });
    repository.getEmployees.mockResolvedValue([
      {
        range: ' PS/NE-IN ', org_unit: 'Unit  A', direct_or_indirect: 'I',
        employee_group: 'INBOUND', ps_group: 'SL2', gender_key: 'Female', joined_in_month: true,
      },
      {
        range: 'PS/NE-IN', org_unit: 'Unit A', direct_or_indirect: 'D',
        employee_group: '', ps_group: 'GROUP1', gender_key: 'Male', joined_in_month: true,
      },
      {
        range: 'PS/NE-IN', org_unit: 'Unit A', direct_or_indirect: 'D',
        employee_group: '', ps_group: '', gender_key: '', joined_in_month: true,
      },
      {
        range: 'BidP', org_unit: 'Plant', direct_or_indirect: 'I',
        employee_group: 'INBOUND', ps_group: 'SL2', gender_key: 'Female', joined_in_month: true,
      },
    ]);
    repository.getAttrition.mockResolvedValue([
      { range: 'PS/NE-IN', org_unit: 'Unit A', filter_value: 'Exit', reason_for_action: 'Resignation', detailed_reason_approved: '' },
      { range: 'PS/NE-IN', org_unit: 'Unit A', filter_value: 'Transfer', reason_for_action: 'TRANSFER INTRA BOSCH', detailed_reason_approved: 'Within PS (Within Corp)' },
      { range: 'PS/NE-IN', org_unit: 'Unit A', filter_value: 'Transfer', reason_for_action: 'Transfer', detailed_reason_approved: ' out of ps within rbin ' },
      { range: 'PS/NE-IN', org_unit: 'Unit A', filter_value: 'Transfer', reason_for_action: 'Transfer', detailed_reason_approved: 'Within PS (Into Corp)' },
      { range: 'PS/NE-IN', org_unit: 'Unit A', filter_value: '', reason_for_action: 'INTERNAL', detailed_reason_approved: '' },
      { range: 'GanP', org_unit: 'Plant', filter_value: 'Exit', reason_for_action: 'Resignation', detailed_reason_approved: '' },
    ]);

    const result = await service.calculate('2026-01', 'account');
    const total = (metricKey: string) => result.buckets
      .filter((bucket) => bucket.metricKey === metricKey)
      .reduce((sum, bucket) => ({
        numerator: sum.numerator + bucket.numerator,
        denominator: sum.denominator + (bucket.denominator ?? 0),
        qualityCount: sum.qualityCount + bucket.qualityCount,
      }), { numerator: 0, denominator: 0, qualityCount: 0 });
    const indirect = result.buckets.find((bucket) => bucket.metricKey === 'indirect-mss');

    expect(indirect).toMatchObject({
      dataMonth: '2026-01', rangeKey: 'BIDP', orgUnitKey: 'PLANT', numerator: 1,
    });
    expect(total('direct-mss').numerator).toBe(2);
    expect(total('total-mss').numerator).toBe(4);
    expect(total('expat').numerator).toBe(2);
    expect(total('sul').numerator).toBe(3);
    expect(total('women-slx').numerator).toBe(2);
    expect(total('women-hc')).toMatchObject({ numerator: 2, denominator: 4 });
    expect(total('gender-hiring')).toEqual({ numerator: 2, denominator: 3, qualityCount: 1 });
    expect(total('attrition').numerator).toBe(3);
    expect(total('rotation').numerator).toBe(1);
    expect(total('transfer').numerator).toBe(1);
  });
});