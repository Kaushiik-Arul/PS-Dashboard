import type { DatabaseService } from '../../../database/database.service';
import type { RbinAttritionRepository } from './rbin-attrition.repository';
import { RbinCleaningRepository } from './rbin-cleaning.repository';
import { rbinSourceColumns, type RbinSourceValues } from './rbin-cleaning.types';

function sourceValues(overrides: Partial<RbinSourceValues> = {}): RbinSourceValues {
  return {
    ...Object.fromEntries(rbinSourceColumns.map((column) => [column, `${column}-value`])) as RbinSourceValues,
    pers_no: '12345',
    personnel_number: '12345',
    organisational_area_pa: 'PS',
    organizational_unit: 'PS/NEW',
    ps_group: 'B',
    ...overrides,
  };
}

describe('RbinCleaningRepository career finalization', () => {
  it('stores an upload without writing automatic Career Journey events', async () => {
    const attritionRepository = { track: jest.fn() } as unknown as RbinAttritionRepository;
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO public.rbin_namelist_imports')) {
        return { rows: [{ id: '2' }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO public.rbin_staging_batches')) {
        return { rows: [{ batch_id: 'batch-id' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const database = {
      transaction: jest.fn(async (callback: (client: { query: typeof query }) => Promise<string>) => callback({ query })),
    } as unknown as DatabaseService;
    const repository = new RbinCleaningRepository(database, attritionRepository);

    await expect(repository.createBatch(
      'account-id',
      '2026-02-01',
      { originalname: 'rbin.csv', buffer: Buffer.from('rbin') },
      [{ rowNumber: 2, values: sourceValues() }],
      [],
    )).resolves.toBe('batch-id');

    expect(query.mock.calls.some(([sql]) => sql.includes('employee_career_journey'))).toBe(false);
    expect(attritionRepository.track).not.toHaveBeenCalled();
  });

  it('creates movements during finalization and applies finalized history retention', async () => {
    const attritionRepository = {
      track: jest.fn().mockResolvedValue(undefined),
    } as unknown as RbinAttritionRepository;
    const previous = sourceValues({
      organisational_area_pa: 'Other',
      organizational_unit: 'OTHER/OLD',
      ps_group: 'A',
    });
    const current = sourceValues();
    const stored = { source_row_number: 2, raw_source_data: current, ...current };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT batch.invalid_rows')) {
        return {
          rows: [{ invalid_rows: 0, import_id: '2', reporting_month: '2026-02-01' }],
          rowCount: 1,
        };
      }
      if (sql.includes('SELECT source_row_number, raw_source_data, stored_row_data')) {
        return {
          rows: [{ source_row_number: 2, raw_source_data: current, stored_row_data: stored }],
          rowCount: 1,
        };
      }
      if (sql.includes('WITH previous AS')) {
        return {
          rows: [{ import_id: '1', batch_id: 'previous-batch', raw_source_data: previous }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });
    const database = {
      transaction: jest.fn(async (callback: (client: { query: typeof query }) => Promise<void>) => callback({ query })),
    } as unknown as DatabaseService;
    const repository = new RbinCleaningRepository(database, attritionRepository);

    await repository.finalize('batch-id', 'account-id');

    const movementInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO public.employee_career_journey'));
    expect(movementInsert).toBeDefined();
    expect(JSON.parse(movementInsert?.[1]?.[0] as string)).toEqual([
      expect.objectContaining({ pers_no: '12345', event_type: 'entry_to_ps' }),
    ]);
    expect(query.mock.calls.some(([sql]) => (
      sql.includes("batch.status IN ('ready_for_export', 'exported')")
      && sql.includes('upload.reporting_month < $1::date')
    ))).toBe(true);
    expect(query.mock.calls.some(([sql]) => (
      sql.includes('DENSE_RANK() OVER (ORDER BY upload.reporting_month DESC)')
      && sql.includes('month_rank > 2 OR import_rank > 1')
    ))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('DELETE FROM public.rbin_namelist_imports'))).toBe(false);
    expect(attritionRepository.track).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      reportingMonth: '2026-02-01',
      previousImportId: '1',
      previousBatchId: 'previous-batch',
      currentImportId: '2',
      currentBatchId: 'batch-id',
    }));
  });
});