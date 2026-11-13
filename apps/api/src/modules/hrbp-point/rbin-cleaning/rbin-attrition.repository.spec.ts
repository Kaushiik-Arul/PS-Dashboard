import type { PoolClient } from 'pg';
import { RbinAttritionRepository } from './rbin-attrition.repository';
import { rbinSourceColumns, type RbinSourceValues } from './rbin-cleaning.types';

function values(persNo: string, overrides: Partial<RbinSourceValues> = {}): RbinSourceValues {
  return {
    ...Object.fromEntries(rbinSourceColumns.map((column) => [column, `${column}-value`])) as RbinSourceValues,
    pers_no: persNo,
    personnel_number: persNo,
    organisational_area_pa: 'PS',
    organizational_unit: 'PS/OLD',
    ...overrides,
  };
}

describe('RbinAttritionRepository', () => {
  it('persists an automatic event and never writes legacy Attrition tables', async () => {
    const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
      if (sql.includes("current_data->>'pers_no'")) {
        return parameters?.[0] === 'previous-batch'
          ? { rows: [{ pers_no: '1001', organizational_unit: 'PS/OLD', range: 'NaP' }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      if (sql.includes('SELECT pers_no::TEXT')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO public.attrition_tracking_runs')) {
        return { rows: [{ run_id: 'run-id' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const repository = new RbinAttritionRepository();

    await repository.track({ query } as unknown as PoolClient, {
      actorAccountId: 'account-id',
      reportingMonth: '2026-07-01',
      previousImportId: '1',
      previousBatchId: 'previous-batch',
      currentImportId: '2',
      currentBatchId: 'current-batch',
      previousRawRows: [{ values: values('1001') }],
      currentRawRows: [{
        rowNumber: 2,
        values: values('1001', { organisational_area_pa: 'Other', organizational_unit: 'OTHER/NEW' }),
      }],
    });

    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO public.employee_attrition_events'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => /public\.attrition_(rows|imports|state|previews)/.test(sql))).toBe(false);
    expect(query.mock.calls.some(([sql]) => (
      sql.includes("source = 'rbin'") && sql.includes('is_reviewed = FALSE')
    ))).toBe(true);
  });

  it('stores missing employees as candidates and resolves returning pending candidates', async () => {
    const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
      if (sql.includes("current_data->>'pers_no'")) {
        return parameters?.[0] === 'previous-batch'
          ? { rows: [{ pers_no: '1001', organizational_unit: 'PS/OLD', range: 'NaP' }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      if (sql.includes('SELECT pers_no::TEXT')) {
        return { rows: [{ pers_no: '2002' }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO public.attrition_tracking_runs')) {
        return { rows: [{ run_id: 'run-id' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const repository = new RbinAttritionRepository();

    await repository.track({ query } as unknown as PoolClient, {
      actorAccountId: 'account-id',
      reportingMonth: '2026-07-01',
      previousImportId: '1',
      previousBatchId: 'previous-batch',
      currentImportId: '2',
      currentBatchId: 'current-batch',
      previousRawRows: [{ values: values('1001') }],
      currentRawRows: [{ rowNumber: 2, values: values('2002') }],
    });

    expect(query.mock.calls.some(([sql]) => sql.includes("SET status = 'reappeared'"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO public.attrition_departure_candidates'))).toBe(true);
  });
});