import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import type { CareerJourneyEvent, CareerJourneyInput } from './career-journey.types';

type CareerRow = {
  event_id: string; pers_no: string; event_month: Date | string;
  event_type: CareerJourneyEvent['eventType'];
  old_organisational_area_pa: string | null; new_organisational_area_pa: string | null;
  old_organizational_unit: string | null; new_organizational_unit: string | null;
  old_ps_group: string | null; new_ps_group: string | null;
  source: CareerJourneyEvent['source']; notes: string | null; is_reviewed: boolean;
  updated_at: Date | string; updated_by: string | null;
};

const selectedColumns = `journey.event_id, journey.pers_no::text, journey.event_month,
  journey.event_type, journey.old_organisational_area_pa, journey.new_organisational_area_pa,
  journey.old_organizational_unit, journey.new_organizational_unit,
  journey.old_ps_group, journey.new_ps_group, journey.source, journey.notes,
  journey.is_reviewed, journey.updated_at,
  COALESCE(account.display_name, journey.updated_by_account_id::text, 'System') AS updated_by`;

function mapRow(row: CareerRow): CareerJourneyEvent {
  const date = row.event_month instanceof Date ? row.event_month.toISOString() : row.event_month;
  return {
    id: row.event_id, persNo: row.pers_no, eventMonth: date.slice(0, 10), eventType: row.event_type,
    oldOrganisationalAreaPa: row.old_organisational_area_pa,
    newOrganisationalAreaPa: row.new_organisational_area_pa,
    oldOrganizationalUnit: row.old_organizational_unit,
    newOrganizationalUnit: row.new_organizational_unit,
    oldPsGroup: row.old_ps_group, newPsGroup: row.new_ps_group,
    source: row.source, notes: row.notes, isReviewed: row.is_reviewed,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
    updatedBy: row.updated_by ?? 'System',
  };
}

const inputValues = (persNo: string, input: CareerJourneyInput, actorAccountId: string) => [
  persNo, input.eventMonth, input.oldOrganisationalAreaPa, input.newOrganisationalAreaPa,
  input.oldOrganizationalUnit, input.newOrganizationalUnit, input.oldPsGroup,
  input.newPsGroup, input.notes, actorAccountId,
];

@Injectable()
export class CareerJourneyRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(persNo: string): Promise<CareerJourneyEvent[]> {
    const result = await this.database.query<CareerRow>(
      `SELECT ${selectedColumns}
       FROM public.employee_career_journey journey
       LEFT JOIN public.auth_accounts account ON account.account_id = journey.updated_by_account_id
       WHERE journey.pers_no = $1 AND journey.deleted_at IS NULL
       ORDER BY journey.event_month DESC, journey.updated_at DESC`,
      [persNo],
    );
    return result.rows.map(mapRow);
  }

  create(persNo: string, input: CareerJourneyInput, actorAccountId: string): Promise<CareerJourneyEvent> {
    return this.database.transaction(async (client) => {
      const result = await client.query<CareerRow>(
        `WITH journey AS (
           INSERT INTO public.employee_career_journey (
             pers_no, event_month, event_type, old_organisational_area_pa,
             new_organisational_area_pa, old_organizational_unit, new_organizational_unit,
             old_ps_group, new_ps_group, source, notes, is_reviewed,
             created_by_account_id, updated_by_account_id
           ) VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7, $8, 'manual', $9, TRUE, $10, $10)
           RETURNING *
         ) SELECT ${selectedColumns}
         FROM journey LEFT JOIN public.auth_accounts account ON account.account_id = journey.updated_by_account_id`,
        inputValues(persNo, input, actorAccountId),
      );
      const event = mapRow(result.rows[0]);
      await this.audit(client, 'career_event_created', actorAccountId, { event });
      return event;
    });
  }

  update(id: string, persNo: string, input: CareerJourneyInput, actorAccountId: string): Promise<CareerJourneyEvent | null> {
    return this.database.transaction(async (client) => {
      const previous = await this.findForUpdate(client, id, persNo);
      if (!previous) return null;
      const result = await client.query<CareerRow>(
        `WITH journey AS (
           UPDATE public.employee_career_journey
           SET event_month = CASE WHEN source = 'rbin' THEN event_month ELSE $2::date END,
             old_organisational_area_pa = $3, new_organisational_area_pa = $4,
             old_organizational_unit = $5, new_organizational_unit = $6,
             old_ps_group = $7, new_ps_group = $8, notes = $9,
             is_reviewed = TRUE, updated_by_account_id = $10, updated_at = CURRENT_TIMESTAMP
           WHERE event_id = $11 AND pers_no = $1 AND deleted_at IS NULL RETURNING *
         ) SELECT ${selectedColumns}
         FROM journey LEFT JOIN public.auth_accounts account ON account.account_id = journey.updated_by_account_id`,
        [...inputValues(persNo, input, actorAccountId), id],
      );
      const event = mapRow(result.rows[0]);
      await this.audit(client, 'career_event_updated', actorAccountId, { previous: mapRow(previous), event });
      return event;
    });
  }

  delete(id: string, persNo: string, actorAccountId: string): Promise<boolean> {
    return this.database.transaction(async (client) => {
      const previous = await this.findForUpdate(client, id, persNo);
      if (!previous) return false;
      await client.query(
        `UPDATE public.employee_career_journey
         SET is_reviewed = TRUE, deleted_by_account_id = $3, deleted_at = CURRENT_TIMESTAMP,
             updated_by_account_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE event_id = $1 AND pers_no = $2 AND deleted_at IS NULL`,
        [id, persNo, actorAccountId],
      );
      await this.audit(client, 'career_event_deleted', actorAccountId, { event: mapRow(previous) });
      return true;
    });
  }

  private async findForUpdate(client: PoolClient, id: string, persNo: string): Promise<CareerRow | null> {
    const result = await client.query<CareerRow>(
      `SELECT ${selectedColumns}
       FROM public.employee_career_journey journey
       LEFT JOIN public.auth_accounts account ON account.account_id = journey.updated_by_account_id
       WHERE journey.event_id = $1 AND journey.pers_no = $2 AND journey.deleted_at IS NULL
       FOR UPDATE OF journey`,
      [id, persNo],
    );
    return result.rows[0] ?? null;
  }

  private audit(client: PoolClient, eventType: string, actorAccountId: string, details: Record<string, unknown>) {
    return client.query(
      `INSERT INTO public.security_audit_log (event_type, actor_account_id, event_details) VALUES ($1, $2, $3)`,
      [eventType, actorAccountId, details],
    );
  }
}