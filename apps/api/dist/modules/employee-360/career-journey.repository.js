"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareerJourneyRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
const selectedColumns = `journey.event_id, journey.pers_no::text, journey.event_month,
  journey.event_type, journey.old_organisational_area_pa, journey.new_organisational_area_pa,
  journey.old_organizational_unit, journey.new_organizational_unit,
  journey.old_ps_group, journey.new_ps_group, journey.source, journey.notes,
  journey.is_reviewed, journey.updated_at,
  COALESCE(account.display_name, journey.updated_by_account_id::text, 'System') AS updated_by`;
function mapRow(row) {
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
const inputValues = (persNo, input, actorAccountId) => [
    persNo, input.eventMonth, input.oldOrganisationalAreaPa, input.newOrganisationalAreaPa,
    input.oldOrganizationalUnit, input.newOrganizationalUnit, input.oldPsGroup,
    input.newPsGroup, input.notes, actorAccountId,
];
let CareerJourneyRepository = class CareerJourneyRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list(persNo) {
        const result = await this.database.query(`SELECT ${selectedColumns}
       FROM public.employee_career_journey journey
       LEFT JOIN public.auth_accounts account ON account.account_id = journey.updated_by_account_id
       WHERE journey.pers_no = $1 AND journey.deleted_at IS NULL
       ORDER BY journey.event_month DESC, journey.updated_at DESC`, [persNo]);
        return result.rows.map(mapRow);
    }
    create(persNo, input, actorAccountId) {
        return this.database.transaction(async (client) => {
            const result = await client.query(`WITH journey AS (
           INSERT INTO public.employee_career_journey (
             pers_no, event_month, event_type, old_organisational_area_pa,
             new_organisational_area_pa, old_organizational_unit, new_organizational_unit,
             old_ps_group, new_ps_group, source, notes, is_reviewed,
             created_by_account_id, updated_by_account_id
           ) VALUES ($1, $2, 'manual', $3, $4, $5, $6, $7, $8, 'manual', $9, TRUE, $10, $10)
           RETURNING *
         ) SELECT ${selectedColumns}
         FROM journey LEFT JOIN public.auth_accounts account ON account.account_id = journey.updated_by_account_id`, inputValues(persNo, input, actorAccountId));
            const event = mapRow(result.rows[0]);
            await this.audit(client, 'career_event_created', actorAccountId, { event });
            return event;
        });
    }
    update(id, persNo, input, actorAccountId) {
        return this.database.transaction(async (client) => {
            const previous = await this.findForUpdate(client, id, persNo);
            if (!previous)
                return null;
            const result = await client.query(`WITH journey AS (
           UPDATE public.employee_career_journey
           SET event_month = CASE WHEN source = 'rbin' THEN event_month ELSE $2::date END,
             old_organisational_area_pa = $3, new_organisational_area_pa = $4,
             old_organizational_unit = $5, new_organizational_unit = $6,
             old_ps_group = $7, new_ps_group = $8, notes = $9,
             is_reviewed = TRUE, updated_by_account_id = $10, updated_at = CURRENT_TIMESTAMP
           WHERE event_id = $11 AND pers_no = $1 AND deleted_at IS NULL RETURNING *
         ) SELECT ${selectedColumns}
         FROM journey LEFT JOIN public.auth_accounts account ON account.account_id = journey.updated_by_account_id`, [...inputValues(persNo, input, actorAccountId), id]);
            const event = mapRow(result.rows[0]);
            await this.audit(client, 'career_event_updated', actorAccountId, { previous: mapRow(previous), event });
            return event;
        });
    }
    delete(id, persNo, actorAccountId) {
        return this.database.transaction(async (client) => {
            const previous = await this.findForUpdate(client, id, persNo);
            if (!previous)
                return false;
            await client.query(`UPDATE public.employee_career_journey
         SET is_reviewed = TRUE, deleted_by_account_id = $3, deleted_at = CURRENT_TIMESTAMP,
             updated_by_account_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE event_id = $1 AND pers_no = $2 AND deleted_at IS NULL`, [id, persNo, actorAccountId]);
            await this.audit(client, 'career_event_deleted', actorAccountId, { event: mapRow(previous) });
            return true;
        });
    }
    async findForUpdate(client, id, persNo) {
        const result = await client.query(`SELECT ${selectedColumns}
       FROM public.employee_career_journey journey
       LEFT JOIN public.auth_accounts account ON account.account_id = journey.updated_by_account_id
       WHERE journey.event_id = $1 AND journey.pers_no = $2 AND journey.deleted_at IS NULL
       FOR UPDATE OF journey`, [id, persNo]);
        return result.rows[0] ?? null;
    }
    audit(client, eventType, actorAccountId, details) {
        return client.query(`INSERT INTO public.security_audit_log (event_type, actor_account_id, event_details) VALUES ($1, $2, $3)`, [eventType, actorAccountId, details]);
    }
};
exports.CareerJourneyRepository = CareerJourneyRepository;
exports.CareerJourneyRepository = CareerJourneyRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CareerJourneyRepository);
//# sourceMappingURL=career-journey.repository.js.map