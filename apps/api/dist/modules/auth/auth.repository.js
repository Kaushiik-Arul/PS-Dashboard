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
exports.AuthRepository = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_service_1 = require("../../database/database.service");
function mapAccount(row) {
    const role = selectPrimaryRole(row.roles);
    return {
        accountId: row.account_id,
        persNo: row.pers_no,
        displayName: row.display_name,
        loginEmail: row.login_email,
        passwordHash: row.password_hash,
        mustChangePassword: row.must_change_password,
        accountStatus: row.account_status,
        failedLoginAttempts: row.failed_login_attempts,
        lockedUntil: row.locked_until,
        role,
        roles: row.roles,
    };
}
function selectPrimaryRole(roles) {
    const priority = [
        'hrbp',
        'admin',
        'range_head',
        'department_head',
        'sub_department_head',
    ];
    const role = priority.find((candidate) => roles.includes(candidate));
    if (!role)
        throw new Error('Account has no access assignment');
    return role;
}
let AuthRepository = class AuthRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async findAccountByEmail(email) {
        const result = await this.database.query(`SELECT
         account.account_id,
         account.pers_no,
         account.display_name,
         account.login_email,
         account.password_hash,
         account.must_change_password,
         account.account_status,
         account.failed_login_attempts,
         account.locked_until,
         ARRAY_AGG(DISTINCT access.role ORDER BY access.role) AS roles
       FROM public.auth_accounts account
       INNER JOIN public.master_access access
         ON access.account_id = account.account_id
       WHERE account.login_email = $1
       GROUP BY account.account_id`, [email]);
        return result.rows[0] ? mapAccount(result.rows[0]) : null;
    }
    async recordFailedLogin(accountId) {
        await this.database.transaction(async (client) => {
            await client.query(`UPDATE public.auth_accounts
         SET failed_login_attempts = failed_login_attempts + 1,
             account_status = CASE
               WHEN failed_login_attempts + 1 >= 5 THEN 'locked'
               ELSE account_status
             END,
             locked_until = CASE
               WHEN failed_login_attempts + 1 >= 5
                 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
               ELSE locked_until
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = $1`, [accountId]);
            await this.insertAudit(client, 'login_failed', null, accountId, {});
        });
    }
    async createSession(account, tokenHash, csrfTokenHash, expiresAt, metadata) {
        return this.database.transaction(async (client) => {
            const sessionId = (0, node_crypto_1.randomUUID)();
            await client.query(`UPDATE public.auth_accounts
         SET failed_login_attempts = 0,
             locked_until = NULL,
             account_status = 'active',
             last_login_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = $1`, [account.accountId]);
            await client.query(`INSERT INTO public.auth_sessions (
           session_id,
           account_id,
           token_hash,
           csrf_token_hash,
           expires_at,
           ip_address,
           user_agent
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                sessionId,
                account.accountId,
                tokenHash,
                csrfTokenHash,
                expiresAt,
                metadata.ipAddress,
                metadata.userAgent,
            ]);
            await this.insertAudit(client, 'login_succeeded', account.accountId, account.accountId, {}, metadata);
            return sessionId;
        });
    }
    async findActiveSession(tokenHash) {
        const result = await this.database.query(`SELECT
         session.session_id,
         session.csrf_token_hash,
         account.account_id,
         account.pers_no,
         account.display_name,
         account.login_email,
         account.password_hash,
         account.must_change_password,
         account.account_status,
         account.failed_login_attempts,
         account.locked_until,
         ARRAY_AGG(DISTINCT access.role ORDER BY access.role) AS roles
       FROM public.auth_sessions session
       INNER JOIN public.auth_accounts account
         ON account.account_id = session.account_id
       INNER JOIN public.master_access access
         ON access.account_id = account.account_id
       WHERE session.token_hash = $1
         AND session.revoked_at IS NULL
         AND session.expires_at > CURRENT_TIMESTAMP
         AND account.account_status = 'active'
       GROUP BY session.session_id, account.account_id`, [tokenHash]);
        const row = result.rows[0];
        if (!row)
            return null;
        await this.database.query(`UPDATE public.auth_sessions
       SET last_seen_at = CURRENT_TIMESTAMP
       WHERE session_id = $1
         AND (last_seen_at IS NULL OR last_seen_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes')`, [row.session_id]);
        return {
            accountId: row.account_id,
            persNo: row.pers_no,
            displayName: row.display_name,
            loginEmail: row.login_email,
            role: selectPrimaryRole(row.roles),
            roles: row.roles,
            mustChangePassword: row.must_change_password,
            sessionId: row.session_id,
            csrfTokenHash: row.csrf_token_hash,
        };
    }
    async changePasswordAndRotateSession(user, passwordHash, tokenHash, csrfTokenHash, expiresAt, metadata) {
        return this.database.transaction(async (client) => {
            await client.query(`UPDATE public.auth_accounts
         SET password_hash = $2,
             must_change_password = FALSE,
             failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = $1`, [user.accountId, passwordHash]);
            await client.query(`UPDATE public.auth_sessions
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_reason = 'password_changed'
         WHERE account_id = $1 AND revoked_at IS NULL`, [user.accountId]);
            const sessionId = (0, node_crypto_1.randomUUID)();
            await client.query(`INSERT INTO public.auth_sessions (
           session_id,
           account_id,
           token_hash,
           csrf_token_hash,
           expires_at,
           ip_address,
           user_agent
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                sessionId,
                user.accountId,
                tokenHash,
                csrfTokenHash,
                expiresAt,
                metadata.ipAddress,
                metadata.userAgent,
            ]);
            await this.insertAudit(client, 'password_changed', user.accountId, user.accountId, {}, metadata);
            return sessionId;
        });
    }
    async getPasswordHash(accountId) {
        const result = await this.database.query(`SELECT password_hash
       FROM public.auth_accounts
       WHERE account_id = $1`, [accountId]);
        return result.rows[0]?.password_hash ?? null;
    }
    async revokeSession(user, metadata) {
        await this.database.transaction(async (client) => {
            await client.query(`UPDATE public.auth_sessions
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_reason = 'logout'
         WHERE session_id = $1 AND revoked_at IS NULL`, [user.sessionId]);
            await this.insertAudit(client, 'logout', user.accountId, user.accountId, {}, metadata);
        });
    }
    insertAudit(client, eventType, actorAccountId, targetAccountId, eventDetails, metadata = { ipAddress: null, userAgent: null }) {
        return client.query(`INSERT INTO public.security_audit_log (
         event_type,
         actor_account_id,
         target_account_id,
         event_details,
         ip_address,
         user_agent
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
exports.AuthRepository = AuthRepository;
exports.AuthRepository = AuthRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuthRepository);
//# sourceMappingURL=auth.repository.js.map