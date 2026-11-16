import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type {
  AttritionMovementCounts,
  AttritionMovementItem,
  AttritionMovementsPage,
  AttritionMovementView,
  ConfirmPendingCandidateInput,
  ConfirmPendingCandidateResult,
  ConfirmedAttritionExportRow,
  PendingAttritionCandidate,
} from './attrition-movements.types';

type ExportRow = {
  event_id: string;
  pers_no: string;
  employee_name: string | null;
  event_month: string;
  exit_lwd: string | null;
  event_type: string;
  transfer_type: string | null;
  within_ps_type: string | null;
  counts_as_ps_attrition: boolean;
  classification_status: string;
  source: string;
  exit_reason: string | null;
  old_organisational_area_pa: string | null;
  new_organisational_area_pa: string | null;
  old_organizational_unit: string | null;
  new_organizational_unit: string | null;
  old_range: string | null;
  new_range: string | null;
  old_range_type: string | null;
  new_range_type: string | null;
  notes: string | null;
  is_reviewed: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type MovementRow = {
  id: string;
  record_type: 'event' | 'candidate';
  pers_no: string;
  employee_name: string | null;
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

type CandidateRow = {
  candidate_id: string;
  run_id: string | null;
  pers_no: string;
  employee_name: string | null;
  detected_month: Date | string;
  source: string;
  previous_organisational_area_pa: string | null;
  previous_organizational_unit: string | null;
  previous_range: string | null;
  previous_range_type: string | null;
  previous_import_id: string | null;
  current_import_id: string | null;
};

const recordsCte = `WITH movement_records AS (
  SELECT event.event_id::text AS id, 'event'::text AS record_type,
    event.pers_no::text AS pers_no, event.employee_name, event.event_month AS movement_month,
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
    candidate.employee_name, candidate.detected_month, 'departure_candidate'::text,
    NULL::text, NULL::text, NULL::text, FALSE, candidate.status,
    candidate.source, candidate.exit_lwd, candidate.exit_reason,
    candidate.previous_organisational_area_pa, NULL::text,
    candidate.previous_organizational_unit, NULL::text,
    candidate.previous_range, NULL::text, candidate.previous_range_type, NULL::text
  FROM public.attrition_departure_candidates candidate
  WHERE candidate.status = 'pending'
), filtered_records AS (
  SELECT * FROM movement_records record
  WHERE ($1::text = '' OR CONCAT_WS(' ', record.pers_no, record.employee_name, record.category, record.event_type,
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
    employeeName: row.employee_name,
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

  async getPendingCandidate(candidateId: string): Promise<PendingAttritionCandidate | null> {
    const result = await this.database.query<CandidateRow>(
      `SELECT candidate_id::text, run_id::text, pers_no::text, employee_name,
         detected_month, source, previous_organisational_area_pa,
         previous_organizational_unit, previous_range, previous_range_type,
         previous_import_id::text, current_import_id::text
       FROM public.attrition_departure_candidates
       WHERE candidate_id = $1 AND status = 'pending'`,
      [candidateId],
    );
    const candidate = result.rows[0];
    return candidate ? this.mapCandidate(candidate) : null;
  }

  async confirmPendingCandidate(
    candidateId: string,
    input: ConfirmPendingCandidateInput,
    actor: string,
  ): Promise<ConfirmPendingCandidateResult> {
    return this.database.transaction(async (client) => {
      const candidateResult = await client.query<CandidateRow>(
        `SELECT candidate_id::text, run_id::text, pers_no::text, employee_name,
           detected_month, source, previous_organisational_area_pa,
           previous_organizational_unit, previous_range, previous_range_type,
           previous_import_id::text, current_import_id::text
         FROM public.attrition_departure_candidates
         WHERE candidate_id = $1 AND status = 'pending'
         FOR UPDATE`,
        [candidateId],
      );
      const candidate = candidateResult.rows[0];
      if (!candidate) return { status: 'not_found' };

      const eventResult = await client.query<{ event_id: string }>(
        `INSERT INTO public.employee_attrition_events (
           run_id, pers_no, employee_name, event_month, event_type,
           transfer_type, within_ps_type, counts_as_ps_attrition,
           classification_status, source, old_organisational_area_pa,
           old_organizational_unit, old_range, old_range_type,
           previous_import_id, current_import_id, exit_lwd, exit_reason,
           notes, is_reviewed, created_by_account_id, updated_by_account_id
         ) VALUES (
           $1, $2::bigint, $3, DATE_TRUNC('month', $4::date)::date, $5,
           CASE WHEN $5 = 'transfer' THEN 'out_of_ps_out_of_rbin' ELSE NULL END,
           NULL, TRUE, 'confirmed', 'manual', $6, $7, $8, $9,
           $10::bigint, $11::bigint, $4::date, $12, $13, TRUE, $14::uuid, $14::uuid
         )
         ON CONFLICT (pers_no, event_month) WHERE deleted_at IS NULL DO NOTHING
         RETURNING event_id::text`,
        [
          candidate.run_id,
          candidate.pers_no,
          candidate.employee_name,
          input.exitLwd,
          input.movementType,
          candidate.previous_organisational_area_pa,
          candidate.previous_organizational_unit,
          candidate.previous_range,
          candidate.previous_range_type,
          candidate.previous_import_id,
          candidate.current_import_id,
          input.exitReason,
          input.notes,
          actor,
        ],
      );
      const eventId = eventResult.rows[0]?.event_id;
      if (!eventId) return { status: 'conflict' };

      await client.query(
        `UPDATE public.attrition_departure_candidates SET
           status = 'matched', linked_event_id = $2,
           resolution_note = 'Manual attrition confirmation.',
           resolved_by_account_id = $3::uuid, resolved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE candidate_id = $1`,
        [candidateId, eventId, actor],
      );
      return { status: 'confirmed', eventId };
    });
  }

  async getConfirmedExportRows(): Promise<ConfirmedAttritionExportRow[]> {
    const result = await this.database.query<ExportRow>(
      `SELECT event.event_id::text, event.pers_no::text, event.employee_name,
         TO_CHAR(event.event_month, 'YYYY-MM-DD') AS event_month,
         CASE WHEN event.exit_lwd IS NULL THEN NULL ELSE TO_CHAR(event.exit_lwd, 'YYYY-MM-DD') END AS exit_lwd,
         event.event_type, event.transfer_type, event.within_ps_type,
         event.counts_as_ps_attrition, event.classification_status, event.source,
         event.exit_reason, event.old_organisational_area_pa, event.new_organisational_area_pa,
         event.old_organizational_unit, event.new_organizational_unit,
         event.old_range, event.new_range, event.old_range_type, event.new_range_type,
         event.notes, event.is_reviewed, event.created_at, event.updated_at
       FROM public.employee_attrition_events event
       WHERE event.deleted_at IS NULL AND event.classification_status = 'confirmed'
       ORDER BY event.event_month DESC, event.pers_no, event.event_id`,
    );
    return result.rows.map((row) => ({
      eventId: row.event_id,
      persNo: row.pers_no,
      employeeName: row.employee_name,
      eventMonth: row.event_month,
      exitLwd: row.exit_lwd,
      eventType: row.event_type,
      transferType: row.transfer_type,
      withinPsType: row.within_ps_type,
      countsAsPsAttrition: row.counts_as_ps_attrition,
      classificationStatus: row.classification_status,
      source: row.source,
      exitReason: row.exit_reason,
      oldOrganisationalAreaPa: row.old_organisational_area_pa,
      newOrganisationalAreaPa: row.new_organisational_area_pa,
      oldOrganizationalUnit: row.old_organizational_unit,
      newOrganizationalUnit: row.new_organizational_unit,
      oldRange: row.old_range,
      newRange: row.new_range,
      oldRangeType: row.old_range_type,
      newRangeType: row.new_range_type,
      notes: row.notes,
      isReviewed: row.is_reviewed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async recordExport(
    actorAccountId: string,
    rowCount: number,
    fileName: string,
    fileHash: string,
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO public.attrition_movement_exports (
         exported_by_account_id, row_count, file_name, file_hash
       ) VALUES ($1::uuid, $2, $3, $4)`,
      [actorAccountId, rowCount, fileName, fileHash],
    );
  }

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
           UNION SELECT detected_month FROM public.attrition_departure_candidates WHERE status = 'pending'
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

  private mapCandidate(candidate: CandidateRow): PendingAttritionCandidate {
    return {
      id: candidate.candidate_id,
      persNo: candidate.pers_no,
      employeeName: candidate.employee_name,
      detectedMonth: mapDate(candidate.detected_month),
      source: candidate.source,
      previousOrganisationalAreaPa: candidate.previous_organisational_area_pa,
      previousOrganizationalUnit: candidate.previous_organizational_unit,
      previousRange: candidate.previous_range,
      previousRangeType: candidate.previous_range_type,
    };
  }
}