import type { PoolClient } from 'pg';
import type { DatabaseService } from '../../../database/database.service';
import { AttritionMovementsRepository } from './attrition-movements.repository';

describe('AttritionMovementsRepository', () => {
  it('confirms a pending candidate atomically with manual event snapshots', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return { rows: [{
          candidate_id: 'candidate-id',
          run_id: 'run-id',
          pers_no: '1001',
          employee_name: 'Example Employee',
          detected_month: '2026-01-01',
          source: 'rbin',
          previous_organisational_area_pa: 'PS',
          previous_organizational_unit: 'PS/OLD',
          previous_range: 'NaP',
          previous_range_type: 'plant',
          previous_import_id: '1',
          current_import_id: '2',
        }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO public.employee_attrition_events')) {
        return { rows: [{ event_id: 'event-id' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const database = {
      transaction: (operation: (client: PoolClient) => Promise<unknown>) => operation({ query } as unknown as PoolClient),
    } as DatabaseService;
    const repository = new AttritionMovementsRepository(database);

    await expect(repository.confirmPendingCandidate('candidate-id', {
      exitLwd: '2026-01-31',
      movementType: 'transfer',
      exitReason: 'Relocation',
      notes: 'Reviewed',
    }, 'actor-id')).resolves.toEqual({ status: 'confirmed', eventId: 'event-id' });

    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO public.employee_attrition_events'));
    expect(insert?.[0]).toContain("DATE_TRUNC('month', $4::date)");
    expect(insert?.[0]).toContain("THEN 'out_of_ps_out_of_rbin'");
    expect(insert?.[0]).toContain("TRUE, 'confirmed', 'manual'");
    expect(insert?.[0]).toContain('employee_name');
    expect(insert?.[0]).toContain('old_organisational_area_pa');
    expect(insert?.[0]).toContain('ON CONFLICT (pers_no, event_month) WHERE deleted_at IS NULL DO NOTHING');
    expect(insert?.[1]).toEqual([
      'run-id', '1001', 'Example Employee', '2026-01-31', 'transfer',
      'PS', 'PS/OLD', 'NaP', 'plant', '1', '2', 'Relocation', 'Reviewed', 'actor-id',
    ]);
    const update = query.mock.calls.find(([sql]) => sql.includes('UPDATE public.attrition_departure_candidates'));
    expect(update?.[0]).toContain("status = 'matched'");
    expect(update?.[0]).toContain("resolution_note = 'Manual attrition confirmation.'");
    expect(update?.[0]).toContain('resolved_by_account_id = $3::uuid');
    expect(update?.[1]).toEqual(['candidate-id', 'event-id', 'actor-id']);
  });

  it('returns conflict without resolving the candidate when the event insert loses uniqueness', async () => {
    const query = jest.fn(async (sql: string) => sql.includes('FOR UPDATE')
      ? { rows: [{ candidate_id: 'candidate-id', pers_no: '1001' }], rowCount: 1 }
      : { rows: [], rowCount: 0 });
    const database = {
      transaction: (operation: (client: PoolClient) => Promise<unknown>) => operation({ query } as unknown as PoolClient),
    } as DatabaseService;
    const repository = new AttritionMovementsRepository(database);

    await expect(repository.confirmPendingCandidate('candidate-id', {
      exitLwd: '2026-01-31', movementType: 'resignation', exitReason: 'Reason', notes: null,
    }, 'actor-id')).resolves.toEqual({ status: 'conflict' });
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE public.attrition_departure_candidates'))).toBe(false);
  });
});