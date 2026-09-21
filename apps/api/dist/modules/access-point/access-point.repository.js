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
exports.AccessPointRepository = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
function mapCandidate(row) {
    return {
        persNo: row.pers_no,
        employeeName: row.employee_name?.trim() || row.pers_no,
        email: row.official_email?.trim().toLowerCase() || null,
        range: row.range,
        orgUnit: row.organizational_unit,
        designation: row.designation_text,
        hasAccount: row.account_id !== null,
    };
}
function mapAssignment(row) {
    return {
        assignmentId: row.access_assignment_id,
        accountId: row.account_id,
        persNo: row.pers_no,
        employeeName: row.display_name,
        email: row.login_email,
        accountStatus: row.account_status,
        mustChangePassword: row.must_change_password,
        role: row.role,
        assignedRange: row.assigned_range,
        assignedOrgUnit: row.assigned_org_unit,
        updatedAt: row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : new Date(row.updated_at).toISOString(),
    };
}
const assignmentColumns = `
  access.access_assignment_id,
  account.account_id,
  account.pers_no,
  account.display_name,
  account.login_email,
  account.account_status,
  account.must_change_password,
  access.role,
  access.assigned_range,
  access.assigned_org_unit,
  access.updated_at
`;
let AccessPointRepository = class AccessPointRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async searchEmployees(query) {
        const result = await this.database.query(`SELECT
         employee.pers_no,
         employee.personnel_number AS employee_name,
         employee.official_email,
         employee.range,
         employee.organizational_unit,
         employee.designation_text,
         account.account_id
       FROM public.employee_namelist employee
       LEFT JOIN public.auth_accounts account
         ON account.pers_no = employee.pers_no
       WHERE employee.pers_no::text = $1
          OR employee.personnel_number ILIKE $2
       ORDER BY
         CASE WHEN employee.pers_no::text = $1 THEN 0 ELSE 1 END,
         employee.personnel_number
       LIMIT 20`, [query, `%${query}%`]);
        return result.rows.map(mapCandidate);
    }
    async getEmployee(persNo) {
        const result = await this.database.query(`SELECT
         employee.pers_no,
         employee.personnel_number AS employee_name,
         employee.official_email,
         employee.range,
         employee.organizational_unit,
         employee.designation_text,
         account.account_id
       FROM public.employee_namelist employee
       LEFT JOIN public.auth_accounts account
         ON account.pers_no = employee.pers_no
       WHERE employee.pers_no = $1`, [persNo]);
        return result.rows[0] ? mapCandidate(result.rows[0]) : null;
    }
    async getScopeOptions(range) {
        const [rangeResult, orgUnitResult] = await Promise.all([
            this.database.query(`SELECT DISTINCT BTRIM(range) AS value
         FROM public.employee_namelist
         WHERE NULLIF(BTRIM(range), '') IS NOT NULL
         ORDER BY value`),
            this.database.query(`SELECT DISTINCT BTRIM(organizational_unit) AS value
         FROM public.employee_namelist
         WHERE NULLIF(BTRIM(organizational_unit), '') IS NOT NULL
           AND ($1::text IS NULL OR range = $1)
         ORDER BY value`, [range]),
        ]);
        return {
            ranges: rangeResult.rows.map((row) => row.value),
            orgUnits: orgUnitResult.rows.map((row) => row.value),
        };
    }
    async scopeExists(assignedRange, assignedOrgUnit) {
        const result = await this.database.query(`SELECT EXISTS (
         SELECT 1
         FROM public.employee_namelist
         WHERE range = $1
           AND ($2::text IS NULL OR organizational_unit = $2)
       ) AS exists`, [assignedRange, assignedOrgUnit]);
        return result.rows[0]?.exists ?? false;
    }
    async listAssignments() {
        const result = await this.database.query(`SELECT ${assignmentColumns}
       FROM public.master_access access
       INNER JOIN public.auth_accounts account
         ON account.account_id = access.account_id
       WHERE access.role <> 'hrbp'
       ORDER BY account.display_name, access.created_at`);
        return result.rows.map(mapAssignment);
    }
    async createAssignment(employee, values, passwordHash, actorAccountId, metadata) {
        return this.database.transaction(async (client) => {
            const accountResult = await client.query(`SELECT account_id, account_status
         FROM public.auth_accounts
         WHERE pers_no = $1
         FOR UPDATE`, [employee.persNo]);
            let accountId = accountResult.rows[0]?.account_id;
            if (accountResult.rows[0]?.account_status === 'inactive') {
                throw new Error('ACCOUNT_INACTIVE');
            }
            if (!accountId) {
                if (!passwordHash || !employee.email)
                    throw new Error('ACCOUNT_DATA_REQUIRED');
                const created = await client.query(`INSERT INTO public.auth_accounts (
             pers_no, display_name, login_email, password_hash
           ) VALUES ($1, $2, $3, $4)
           RETURNING account_id`, [employee.persNo, employee.employeeName, employee.email, passwordHash]);
                accountId = created.rows[0].account_id;
                await this.insertAudit(client, 'account_created', actorAccountId, accountId, { persNo: employee.persNo }, metadata);
            }
            const unrestricted = await client.query(`SELECT role FROM public.master_access
         WHERE account_id = $1
           AND (role IN ('hrbp', 'admin') OR $2 IN ('hrbp', 'admin'))
         LIMIT 1`, [accountId, values.role]);
            if (unrestricted.rowCount)
                throw new Error('INCOMPATIBLE_ACCESS');
            const assignment = await client.query(`WITH access AS (
           INSERT INTO public.master_access (
             account_id, role, assigned_range, assigned_org_unit,
             created_by_account_id, updated_by_account_id
           ) VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT DO NOTHING
           RETURNING *
         )
         SELECT ${assignmentColumns}
         FROM access
         INNER JOIN public.auth_accounts account
           ON account.account_id = access.account_id`, [
                accountId,
                values.role,
                values.assignedRange,
                values.assignedOrgUnit,
                actorAccountId,
            ]);
            if (!assignment.rows[0])
                throw new Error('DUPLICATE_ASSIGNMENT');
            await client.query(`UPDATE public.auth_sessions
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_reason = 'role_changed'
         WHERE account_id = $1 AND revoked_at IS NULL`, [accountId]);
            await this.insertAudit(client, 'role_changed', actorAccountId, accountId, { action: 'assignment_created', ...values }, metadata);
            return mapAssignment(assignment.rows[0]);
        });
    }
    async updateAssignment(assignmentId, values, actorAccountId, metadata) {
        return this.database.transaction(async (client) => {
            const current = await client.query(`SELECT account_id
         FROM public.master_access
         WHERE access_assignment_id = $1
           AND role <> 'hrbp'
         FOR UPDATE`, [assignmentId]);
            const accountId = current.rows[0]?.account_id;
            if (!accountId)
                return null;
            const incompatible = await client.query(`SELECT 1
         FROM public.master_access
         WHERE account_id = $1
           AND access_assignment_id <> $2
           AND (role IN ('hrbp', 'admin') OR $3 IN ('hrbp', 'admin'))
         LIMIT 1`, [accountId, assignmentId, values.role]);
            if (incompatible.rowCount)
                throw new Error('INCOMPATIBLE_ACCESS');
            const assignment = await client.query(`WITH access AS (
           UPDATE public.master_access
           SET role = $2,
               assigned_range = $3,
               assigned_org_unit = $4,
               updated_by_account_id = $5,
               updated_at = CURRENT_TIMESTAMP
           WHERE access_assignment_id = $1
             AND role <> 'hrbp'
           RETURNING *
         )
         SELECT ${assignmentColumns}
         FROM access
         INNER JOIN public.auth_accounts account
           ON account.account_id = access.account_id`, [
                assignmentId,
                values.role,
                values.assignedRange,
                values.assignedOrgUnit,
                actorAccountId,
            ]);
            const updated = assignment.rows[0];
            if (!updated)
                return null;
            await client.query(`UPDATE public.auth_sessions
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_reason = 'role_changed'
         WHERE account_id = $1 AND revoked_at IS NULL`, [updated.account_id]);
            await this.insertAudit(client, 'role_changed', actorAccountId, updated.account_id, { action: 'assignment_updated', assignmentId, ...values }, metadata);
            return mapAssignment(updated);
        });
    }
    async deactivateAccount(accountId, actorAccountId, metadata) {
        return this.database.transaction(async (client) => {
            const result = await client.query(`UPDATE public.auth_accounts
         SET account_status = 'inactive',
             locked_until = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = $1
           AND account_id <> $2
           AND account_status <> 'inactive'`, [accountId, actorAccountId]);
            if (!result.rowCount)
                return false;
            await client.query(`UPDATE public.auth_sessions
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_reason = 'account_deactivated'
         WHERE account_id = $1 AND revoked_at IS NULL`, [accountId]);
            await this.insertAudit(client, 'account_deactivated', actorAccountId, accountId, {}, metadata);
            return true;
        });
    }
    insertAudit(client, eventType, actorAccountId, targetAccountId, eventDetails, metadata) {
        return client.query(`INSERT INTO public.security_audit_log (
         event_type, actor_account_id, target_account_id,
         event_details, ip_address, user_agent
       ) VALUES ($1, $2, $3, $4, $5, $6)`, [
            eventType,
            actorAccountId,
            targetAccountId,
            eventDetails,
            metadata.ipAddress,
            metadata.userAgent,
        ]);
    }
};
exports.AccessPointRepository = AccessPointRepository;
exports.AccessPointRepository = AccessPointRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AccessPointRepository);
//# sourceMappingURL=access-point.repository.js.map