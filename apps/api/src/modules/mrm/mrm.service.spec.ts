import { MrmCalculationService } from './mrm-calculation.service';
import { MrmRepository } from './mrm.repository';
import type { MrmMetricBucket, MrmReportDocument } from './mrm.types';
import { formatMrmMetricValue, MrmService } from './mrm.service';

function metric(overrides: Partial<MrmMetricBucket> = {}): MrmMetricBucket {
  return {
    dataMonth: '2026-08',
    metricKey: 'gender-hiring',
    rangeKey: '',
    orgUnitKey: '',
    numerator: 1,
    denominator: 2,
    qualityCount: 0,
    ...overrides,
  };
}

describe('formatMrmMetricValue', () => {
  it('shows female and male hiring counts with percentages', () => {
    expect(formatMrmMetricValue(metric())).toBe(
      'F: 1 (50.0%) | M: 1 (50.0%)',
    );
  });

  it('handles a month with no recognized-gender hires', () => {
    expect(formatMrmMetricValue(metric({ numerator: 0, denominator: 0 }))).toBe(
      'F: 0 (0.0%) | M: 0 (0.0%)',
    );
  });

  it('keeps the existing percentage format for other metrics', () => {
    expect(formatMrmMetricValue(metric({ metricKey: 'women-hc' }))).toBe(
      '1 (50.0%)',
    );
  });
});

describe('MrmService calculated overrides', () => {
  it('keeps an override while refreshing an unedited calculated cell', () => {
    const service = new MrmService(
      {} as MrmRepository,
      {} as MrmCalculationService,
    ) as MrmService & {
      applyCalculatedValues(
        document: MrmReportDocument,
        buckets: MrmMetricBucket[],
      ): MrmReportDocument;
    };
    const row = {
      key: 'corp-sul', tableKey: 'ps-corp', calculationKey: 'sul',
      title: 'SUL', description: '', mode: 'calculated' as const,
      highlighted: false, muted: false, emphasized: true, managed: true,
    };
    const document: MrmReportDocument = {
      schemaVersion: 1, reportingMonth: '2026-09', dataMonth: '2026-08',
      status: 'draft', revision: 1, canManage: true,
      sourceStatus: { available: true, source: 'history' },
      columns: [{
        id: 'rolling-latest', key: 'rolling-latest', label: "Aug'26",
        type: 'value', managed: true,
      }],
      rows: [
        { ...row, overrideColumns: ['rolling-latest'], cells: { 'rolling-latest': '81' } },
        { ...row, key: 'corp-sul-auto', overrideColumns: [], cells: {} },
      ],
      attachments: [], updatedAt: null, finalizedAt: null,
    };

    const result = service.applyCalculatedValues(document, [metric({
      metricKey: 'sul', numerator: 82, denominator: null, rangeKey: 'PS/NE-IN',
    })]);

    expect(result.rows[0]?.cells['rolling-latest']).toBe('81');
    expect(result.rows[1]?.cells['rolling-latest']).toBe('82');
  });
});