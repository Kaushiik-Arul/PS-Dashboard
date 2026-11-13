import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type {
  AttritionMovementCounts,
  AttritionMovementItem,
  AttritionMovementsPage,
  AttritionMovementView,
} from './attrition-movements.types';

type MovementRow = {
  id: string;
  record_type: 'event' | 'candidate';
  pers_no: string;
  movement_month: Date | string;
  category: AttritionMovementItem['category'];
  event_type: string | null;
  transfer_type: string | null;
  within_ps_type: string | null;
  counts_as_ps_attrition: boolean;
  record_status: string;
  source: string;
  exit_lwd: Date | string | null;
  exit_reason: string | null;
  old_organisational_area_pa: string | null;
  new_organisational_area_pa: string | null;
  old_organizational_unit: string | null;
  new_organizational_unit: string | null;
  old_range: string | null;
  new_range: string | null;
  old_range_type: string | null;
  new_range_type: string | null;
};

type CountsRow = {
  all_count: string;
  ps_attrition_count: string;
  within_ps_count: string;
  pending_count: string;
};

const recordsCte = `WITH movement_records AS (
  SELECT event.event_id::text AS id, 'event'::text AS record_type,
    event.pers_no::text AS pers_no, event.event_month AS movement_month,
    CASE WHEN event.counts_as_ps_attrition THEN 'ps_attrition' ELSE 'within_ps' END::text AS category,
    event.event_type, event.transfer_type, event.within_ps_type, event.counts_as_ps_attrition,
    event.classification_status AS record_status, event.source, event.exit_lwd, event.exit_reason,
    event.old_organisational_area_pa, event.new_organisational_area_pa,
    event.old_organizational_unit, event.new_organizational_unit,
    event.old_range, event.new_range, event.old_range_type, event.new_range_type
  FROM public.employee_attrition_events event
  WHERE event.deleted_at IS NULL
  UNION ALL
  SELECT candidate.candidate_id::text, 'candidate'::text, candidate.pers_no::text,
    candidate.detected_month, 'departure_candidate'::text,
    NULL::text, NULL::text, NULL::text, FALSE, candidate.status,
    candidate.source, candidate.exit_lwd, candidate.exit_reason,
    candidate.previous_organisational_area_pa, NULL::text,
    candidate.previous_organizational_unit, NULL::text,
    candidate.previous_range, NULL::text, candidate.previous_range_type, NULL::text
  FROM public.attrition_departure_candidates candidate
), filtered_records AS (
  SELECT * FROM movement_records record
  WHERE ($1::text = '' OR CONCAT_WS(' ', record.pers_no, record.category, record.event_type,
      record.transfer_type, record.within_ps_type, record.record_status,
      record.exit_lwd::text, record.exit_reason,
      record.old_organisational_area_pa, record.new_organisational_area_pa,
      record.old_organizational_unit, record.new_organizational_unit,
      record.old_range, record.new_range) ILIKE '%' || $1 || '%')
    AND ($2::integer IS NULL OR EXTRACT(YEAR FROM record.movement_month) = $2)
    AND ($3::integer IS NULL OR EXTRACT(MONTH FROM record.movement_month) = $3)
)`;

function mapDate(value: Date | string): string {
  if (!(value instanceof Date)) return String(value).slice(0, 10);
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapRow(row: MovementRow): AttritionMovementItem {
  return {
    id: row.id,
    recordType: row.record_type,
    persNo: row.pers_no,
    month: mapDate(row.movement_month),
    category: row.category,
    eventType: row.event_type,
    transferType: row.transfer_type,
    withinPsType: row.within_ps_type,
    countsAsPsAttrition: row.counts_as_ps_attrition,
    status: row.record_status,
    source: row.source,
    exitLwd: row.exit_lwd ? mapDate(row.exit_lwd) : null,
    exitReason: row.exit_reason,
    oldOrganisationalAreaPa: row.old_organisational_area_pa,
    newOrganisationalAreaPa: row.new_organisational_area_pa,
    oldOrganizationalUnit: row.old_organizational_unit,
    newOrganizationalUnit: row.new_organizational_unit,
    oldRange: row.old_range,
    newRange: row.new_range,
    oldRangeType: row.old_range_type,
    newRangeType: row.new_range_type,
  };
}

@Injectable()
export class AttritionMovementsRepository {
  constructor(private readonly database: DatabaseService) {}

  async dismissCandidate(candidateId: string, actor: string): Promise<boolean> {
    const result = await this.database.query(
      `UPDATE public.attrition_departure_candidates SET
         status = 'dismissed', linked_event_id = NULL,
         resolution_note = 'Dismissed as a false-positive attrition record.',
         resolved_by_account_id = $2, resolved_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE candidate_id = $1 AND status = 'pending'`,
      [candidateId, actor],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async list(
    view: AttritionMovementView,
    search: string,
    year: number | null,
    month: number | null,
    page: number,
    pageSize: number,
  ): Promise<AttritionMovementsPage> {
    const viewPredicate = `($4::text = 'all'
      OR ($4 = 'ps_attrition' AND record_type = 'event' AND counts_as_ps_attrition)
      OR ($4 = 'within_ps' AND record_type = 'event' AND transfer_type = 'within_ps')
      OR ($4 = 'pending' AND record_type = 'candidate' AND record_status = 'pending'))`;
    const baseParameters = [search, year, month];
    const [items, totals, periods] = await Promise.all([
      this.database.query<MovementRow>(
        `${recordsCte}
         SELECT * FROM filtered_records
         WHERE ${viewPredicate}
         ORDER BY movement_month DESC, category, pers_no::bigint
         LIMIT $5 OFFSET $6`,
        [...baseParameters, view, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<CountsRow>(
        `${recordsCte}
         SELECT COUNT(*)::text AS all_count,
           COUNT(*) FILTER (WHERE record_type = 'event' AND counts_as_ps_attrition)::text AS ps_attrition_count,
           COUNT(*) FILTER (WHERE record_type = 'event' AND transfer_type = 'within_ps')::text AS within_ps_count,
           COUNT(*) FILTER (WHERE record_type = 'candidate' AND record_status = 'pending')::text AS pending_count
         FROM filtered_records`,
        baseParameters,
      ),
      this.database.query<{ period: string }>(
        `SELECT DISTINCT TO_CHAR(record_month, 'YYYY-MM') AS period
         FROM (
           SELECT event_month AS record_month FROM public.employee_attrition_events WHERE deleted_at IS NULL
           UNION SELECT detected_month FROM public.attrition_departure_candidates
         ) periods
         ORDER BY period DESC`,
      ),
    ]);
    const countRow = totals.rows[0];
    const counts: AttritionMovementCounts = {
      all: Number(countRow?.all_count ?? 0),
      psAttrition: Number(countRow?.ps_attrition_count ?? 0),
      withinPs: Number(countRow?.within_ps_count ?? 0),
      pending: Number(countRow?.pending_count ?? 0),
    };
    const total = view === 'all' ? counts.all
      : view === 'ps_attrition' ? counts.psAttrition
      : view === 'within_ps' ? counts.withinPs
      : counts.pending;
    return {
      items: items.rows.map(mapRow),
      total,
      counts,
      availablePeriods: periods.rows.map((row) => row.period),
      page,
      pageSize,
      view,
      search,
      year,
      month,
    };
  }
}