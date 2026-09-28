import type { DatabaseService } from '../../database/database.service';
import { CareerJourneyRepository } from './career-journey.repository';

describe('CareerJourneyRepository.list', () => {
  it('requests calendar dates as text and keeps July, August and the JD effective day', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('employee_career_journey')) return { rows: [
        { event_id: 'july', pers_no: '12345', event_month: '2026-07-01', event_type: 'entry_to_ps',
          old_organisational_area_pa: 'PT', new_organisational_area_pa: 'PS',
          old_organizational_unit: 'PT/SIN', new_organizational_unit: 'PS/SCP-IN',
          old_ps_group: 'GROUP4', new_ps_group: 'GROUP4', source: 'rbin', notes: null,
          is_reviewed: false, updated_at: '2026-07-02T00:00:00Z', updated_by: null },
        { event_id: 'august', pers_no: '12345', event_month: '2026-08-01', event_type: 'internal_ps_change',
          old_organisational_area_pa: 'PS', new_organisational_area_pa: 'PS',
          old_organizational_unit: 'PS/SCP-IN', new_organizational_unit: 'PS-DC/PRM1-IN',
          old_ps_group: 'GROUP4', new_ps_group: 'GROUP4', source: 'rbin', notes: null,
          is_reviewed: false, updated_at: '2026-08-02T00:00:00Z', updated_by: null },
      ] };
      return { rows: [{ movement_id: 'jd', pers_no: '12345', effective_date: '2026-09-28',
        old_jd_id: null, old_role_title: null, new_jd_id: 'JD1', new_role_title: 'Product management',
        source: 'upload', occurred_at: '2026-09-28T01:00:00Z', changed_by: null }] };
    });
    const repository = new CareerJourneyRepository({ query } as unknown as DatabaseService);

    const events = await repository.list('12345');

    expect(events.map((event) => event.eventMonth)).toEqual(['2026-09-28', '2026-08-01', '2026-07-01']);
    expect(query.mock.calls[0][0]).toContain("TO_CHAR(journey.event_month, 'YYYY-MM-DD') AS event_month");
    expect(query.mock.calls[1][0]).toContain("TO_CHAR(movement.effective_date, 'YYYY-MM-DD') AS effective_date");
  });
});
