"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbinAttritionRepository = void 0;
const common_1 = require("@nestjs/common");
const rbin_attrition_detector_1 = require("./rbin-attrition-detector");
let RbinAttritionRepository = class RbinAttritionRepository {
    async track(client, context) {
        const [previousCleanedRows, currentCleanedRows, pendingCandidates] = await Promise.all([
            this.getCleanedRows(client, context.previousBatchId),
            this.getCleanedRows(client, context.currentBatchId),
            client.query(`SELECT pers_no::TEXT FROM public.attrition_departure_candidates
         WHERE status = 'pending' FOR UPDATE`),
        ]);
        const result = (0, rbin_attrition_detector_1.detectAttrition)(context.previousRawRows, context.currentRawRows, previousCleanedRows, currentCleanedRows, pendingCandidates.rows.map((row) => row.pers_no));
        const hasPreviousSnapshot = context.previousImportId !== null && context.previousBatchId !== null;
        if ((context.previousImportId === null) !== (context.previousBatchId === null)) {
            throw new Error('RBIN_ATTRITION_BASELINE_INCOMPLETE');
        }
        if (!hasPreviousSnapshot && (result.events.length || result.departureCandidates.length)) {
            throw new Error('RBIN_ATTRITION_BASELINE_REQUIRED');
        }
        await client.query(`UPDATE public.attrition_tracking_runs
       SET status = 'superseded', superseded_at = CURRENT_TIMESTAMP
       WHERE reporting_month = $1::date AND status = 'active'`, [context.reportingMonth]);
        await client.query(`UPDATE public.employee_attrition_events
       SET deleted_at = CURRENT_TIMESTAMP, deleted_by_account_id = $2,
           updated_by_account_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE event_month = $1::date AND source = 'rbin'
         AND is_reviewed = FALSE AND deleted_at IS NULL`, [context.reportingMonth, context.actorAccountId]);
        const run = await client.query(`INSERT INTO public.attrition_tracking_runs (
         reporting_month, previous_import_id, previous_batch_id,
         current_import_id, current_batch_id, out_of_ps_count,
         within_ps_count, pending_range_count, departure_candidate_count,
         created_by_account_id
       ) VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING run_id`, [
            context.reportingMonth,
            context.previousImportId,
            context.previousBatchId,
            context.currentImportId,
            context.currentBatchId,
            result.events.filter((event) => event.transferType === 'out_of_ps_within_rbin').length,
            result.events.filter((event) => event.transferType === 'within_ps').length,
            result.events.filter((event) => event.classificationStatus === 'pending_range').length,
            result.departureCandidates.length,
            context.actorAccountId,
        ]);
        const runId = run.rows[0].run_id;
        if (result.reappearedPersNos.length) {
            await client.query(`UPDATE public.attrition_departure_candidates
         SET status = 'reappeared', resolved_by_account_id = $2,
             resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
             resolution_note = COALESCE(resolution_note, 'Employee reappeared in a finalized RBIN snapshot.')
         WHERE status = 'pending' AND pers_no = ANY($1::bigint[])`, [result.reappearedPersNos, context.actorAccountId]);
        }
        if (result.events.length) {
            await client.query(`INSERT INTO public.employee_attrition_events (
           run_id, pers_no, event_month, event_type, transfer_type, within_ps_type,
           counts_as_ps_attrition, classification_status, source,
           old_organisational_area_pa, new_organisational_area_pa,
           old_organizational_unit, new_organizational_unit,
           old_range, new_range, old_range_type, new_range_type,
           previous_import_id, current_import_id,
           created_by_account_id, updated_by_account_id
         ) SELECT $1, item.pers_no, $2::date, item.event_type, item.transfer_type,
           item.within_ps_type, item.counts_as_ps_attrition,
           item.classification_status, 'rbin', item.old_organisational_area_pa,
           item.new_organisational_area_pa, item.old_organizational_unit,
           item.new_organizational_unit, item.old_range, item.new_range,
           item.old_range_type, item.new_range_type, $3, $4, $5, $5
         FROM JSONB_TO_RECORDSET($6::jsonb) AS item(
           pers_no bigint, event_type text, transfer_type text, within_ps_type text,
           counts_as_ps_attrition boolean, classification_status text,
           old_organisational_area_pa text, new_organisational_area_pa text,
           old_organizational_unit text, new_organizational_unit text,
           old_range text, new_range text, old_range_type text, new_range_type text
         )
         ON CONFLICT (pers_no, event_month) WHERE deleted_at IS NULL DO NOTHING`, [
                runId,
                context.reportingMonth,
                context.previousImportId,
                context.currentImportId,
                context.actorAccountId,
                JSON.stringify(result.events.map((event) => ({
                    pers_no: event.persNo,
                    event_type: event.eventType,
                    transfer_type: event.transferType,
                    within_ps_type: event.withinPsType,
                    counts_as_ps_attrition: event.countsAsPsAttrition,
                    classification_status: event.classificationStatus,
                    old_organisational_area_pa: event.oldOrganisationalAreaPa,
                    new_organisational_area_pa: event.newOrganisationalAreaPa,
                    old_organizational_unit: event.oldOrganizationalUnit,
                    new_organizational_unit: event.newOrganizationalUnit,
                    old_range: event.oldRange,
                    new_range: event.newRange,
                    old_range_type: event.oldRangeType,
                    new_range_type: event.newRangeType,
                }))),
            ]);
        }
        if (result.departureCandidates.length) {
            await client.query(`INSERT INTO public.attrition_departure_candidates (
           run_id, pers_no, detected_month, previous_organisational_area_pa,
           previous_organizational_unit, previous_range, previous_range_type,
           previous_import_id, current_import_id, created_by_account_id
         ) SELECT $1, item.pers_no, $2::date, item.previous_organisational_area_pa,
           item.previous_organizational_unit, item.previous_range,
           item.previous_range_type, $3, $4, $5
         FROM JSONB_TO_RECORDSET($6::jsonb) AS item(
           pers_no bigint, previous_organisational_area_pa text,
           previous_organizational_unit text, previous_range text,
           previous_range_type text
         )
         ON CONFLICT (pers_no, detected_month) DO UPDATE SET
           run_id = EXCLUDED.run_id,
           previous_organisational_area_pa = EXCLUDED.previous_organisational_area_pa,
           previous_organizational_unit = EXCLUDED.previous_organizational_unit,
           previous_range = EXCLUDED.previous_range,
           previous_range_type = EXCLUDED.previous_range_type,
           previous_import_id = EXCLUDED.previous_import_id,
           current_import_id = EXCLUDED.current_import_id,
           updated_at = CURRENT_TIMESTAMP
         WHERE attrition_departure_candidates.source = 'rbin'
           AND attrition_departure_candidates.status = 'pending'`, [
                runId,
                context.reportingMonth,
                context.previousImportId,
                context.currentImportId,
                context.actorAccountId,
                JSON.stringify(result.departureCandidates.map((candidate) => ({
                    pers_no: candidate.persNo,
                    previous_organisational_area_pa: candidate.previousOrganisationalAreaPa,
                    previous_organizational_unit: candidate.previousOrganizationalUnit,
                    previous_range: candidate.previousRange,
                    previous_range_type: candidate.previousRangeType,
                }))),
            ]);
        }
    }
    async getCleanedRows(client, batchId) {
        if (!batchId)
            return [];
        const result = await client.query(`SELECT current_data->>'pers_no' AS pers_no,
         COALESCE(current_data->>'organizational_unit', '') AS organizational_unit,
         COALESCE(current_data->>'range', '') AS range
       FROM public.rbin_staging_rows
       WHERE batch_id = $1 AND is_valid = TRUE
         AND NULLIF(BTRIM(current_data->>'pers_no'), '') IS NOT NULL
       ORDER BY source_row_number`, [batchId]);
        return result.rows.map((row) => ({
            persNo: row.pers_no,
            organizationalUnit: row.organizational_unit,
            range: row.range,
        }));
    }
};
exports.RbinAttritionRepository = RbinAttritionRepository;
exports.RbinAttritionRepository = RbinAttritionRepository = __decorate([
    (0, common_1.Injectable)()
], RbinAttritionRepository);
//# sourceMappingURL=rbin-attrition.repository.js.map