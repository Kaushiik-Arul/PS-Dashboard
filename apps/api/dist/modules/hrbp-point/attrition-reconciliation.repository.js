"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcilePendingAttrition = reconcilePendingAttrition;
async function reconcilePendingAttrition(client, actor) {
    const result = await client.query(`WITH pairs AS MATERIALIZED (
       SELECT rbin.candidate_id AS rbin_candidate_id,
         ps_exit.candidate_id AS ps_exit_candidate_id,
         rbin.pers_no, rbin.detected_month,
         rbin.previous_organisational_area_pa,
         rbin.previous_organizational_unit,
         rbin.previous_range, rbin.previous_range_type,
         ps_exit.ps_exit_import_id, ps_exit.exit_lwd, ps_exit.exit_reason,
         ps_exit.resolution_note
       FROM public.attrition_departure_candidates rbin
       JOIN public.attrition_departure_candidates ps_exit
         ON ps_exit.pers_no = rbin.pers_no
        AND ps_exit.detected_month = rbin.detected_month
        AND ps_exit.source = 'ps_exit' AND ps_exit.status = 'pending'
       WHERE rbin.source = 'rbin' AND rbin.status = 'pending'
     ), events AS (
       INSERT INTO public.employee_attrition_events (
         pers_no, event_month, event_type, transfer_type, within_ps_type,
         counts_as_ps_attrition, classification_status, source,
         old_organisational_area_pa, old_organizational_unit,
         old_range, old_range_type, ps_exit_import_id, exit_lwd, exit_reason,
         notes, created_by_account_id, updated_by_account_id
       )
       SELECT pair.pers_no, DATE_TRUNC('month', pair.exit_lwd)::date,
         CASE
           WHEN REGEXP_REPLACE(LOWER(pair.exit_reason), '[^a-z0-9]+', ' ', 'g') = 'intra bosch transfer' THEN 'transfer'
           WHEN REGEXP_REPLACE(LOWER(pair.exit_reason), '[^a-z0-9]+', ' ', 'g') IN ('retirement', 'death not related to work') THEN 'retirement'
           ELSE 'resignation'
         END,
         CASE WHEN REGEXP_REPLACE(LOWER(pair.exit_reason), '[^a-z0-9]+', ' ', 'g') = 'intra bosch transfer'
           THEN 'out_of_ps_out_of_rbin' ELSE NULL END,
         NULL, TRUE, 'confirmed', 'ps_exit',
         pair.previous_organisational_area_pa, pair.previous_organizational_unit,
         pair.previous_range, pair.previous_range_type,
         pair.ps_exit_import_id, pair.exit_lwd, pair.exit_reason,
         pair.resolution_note, $1, $1
       FROM pairs pair
       ON CONFLICT (pers_no, event_month) WHERE deleted_at IS NULL DO UPDATE SET
         event_type = EXCLUDED.event_type,
         transfer_type = EXCLUDED.transfer_type,
         within_ps_type = NULL,
         counts_as_ps_attrition = TRUE,
         classification_status = 'confirmed',
         source = 'ps_exit',
         run_id = NULL,
         previous_import_id = NULL,
         current_import_id = NULL,
         old_organisational_area_pa = EXCLUDED.old_organisational_area_pa,
         old_organizational_unit = EXCLUDED.old_organizational_unit,
         old_range = EXCLUDED.old_range,
         old_range_type = EXCLUDED.old_range_type,
         ps_exit_import_id = EXCLUDED.ps_exit_import_id,
         exit_lwd = EXCLUDED.exit_lwd,
         exit_reason = EXCLUDED.exit_reason,
         notes = EXCLUDED.notes,
         updated_by_account_id = $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE employee_attrition_events.source = 'ps_exit'
          OR (employee_attrition_events.source = 'rbin'
            AND employee_attrition_events.transfer_type = 'out_of_ps_within_rbin')
       RETURNING event_id, pers_no, event_month
     ), resolved_rbin AS (
       UPDATE public.attrition_departure_candidates candidate SET
         status = 'matched', linked_event_id = event.event_id,
         resolution_note = 'Matched automatically with PS Exit data.',
         resolved_by_account_id = $1, resolved_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       FROM pairs pair
       JOIN events event ON event.pers_no = pair.pers_no
         AND event.event_month = DATE_TRUNC('month', pair.exit_lwd)::date
       WHERE candidate.candidate_id = pair.rbin_candidate_id
       RETURNING candidate.candidate_id
     )
     UPDATE public.attrition_departure_candidates candidate SET
       status = 'matched', linked_event_id = event.event_id,
       resolution_note = 'Matched automatically with RBIN departure data.',
       resolved_by_account_id = $1, resolved_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
     FROM pairs pair
     JOIN events event ON event.pers_no = pair.pers_no
       AND event.event_month = DATE_TRUNC('month', pair.exit_lwd)::date
     WHERE candidate.candidate_id = pair.ps_exit_candidate_id
       AND EXISTS (SELECT 1 FROM resolved_rbin resolved WHERE resolved.candidate_id = pair.rbin_candidate_id)
     RETURNING event.event_id`, [actor]);
    return result.rowCount ?? result.rows.length;
}
//# sourceMappingURL=attrition-reconciliation.repository.js.map