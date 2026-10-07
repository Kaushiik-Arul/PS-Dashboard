import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import type { AuthenticatedUser, RequestMetadata, UserRole } from './auth.types';

export type AccountRecord = {
  accountId: string;
  persNo: string | null;
  displayName: string;
  loginEmail: string;
  passwordHash: string;
  mustChangePassword: boolean;
  accountStatus: 'active' | 'inactive';
  role: UserRole;
  roles: UserRole[];
};

type AccountRow = {
  account_id: string;
  pers_no: string | null;
  display_name: string;
  login_email: string;
  password_hash: string;
  must_change_password: boolean;
  account_status: AccountRecord['accountStatus'];
  roles: UserRole[];
};

type SessionRow = AccountRow & {
  session_id: string;
  csrf_token_hash: Buffer;
};

function mapAccount(row: AccountRow): AccountRecord {
  const role = selectPrimaryRole(row.roles);

  return {
    accountId: row.account_id,
    persNo: row.pers_no,
    displayName: row.display_name,
    loginEmail: row.login_email,
    passwordHash: row.password_hash,
    mustChangePassword: row.must_change_password,
    accountStatus: row.account_status,
    role,
    roles: row.roles,
  };
}

function selectPrimaryRole(roles: UserRole[]): UserRole {
  const priority: UserRole[] = [
    'hrbp',
    'admin',
    'range_head',
    'department_head',
    'sub_department_head',
  ];
  const role = priority.find((candidate) => roles.includes(candidate));
  if (!role) throw new Error('Account has no access assignment');
  return role;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAccountByEmail(email: string): Promise<AccountRecord | null> {
    const result = await this.database.query<AccountRow>(
      `SELECT
         account.account_id,
         account.pers_no,
         account.display_name,
         account.login_email,
         account.password_hash,
         account.must_change_password,
         account.account_status,
         ARRAY_AGG(DISTINCT access.role ORDER BY access.role) AS roles
       FROM public.auth_accounts account
       INNER JOIN public.master_access access
         ON access.account_id = account.account_id
       WHERE account.login_email = $1
       GROUP BY account.account_id`,
      [email],
    );

    return result.rows[0] ? mapAccount(result.rows[0]) : null;
  }

  async recordFailedLogin(accountId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await this.insertAudit(client, 'login_failed', null, accountId, {});
    });
  }

  async createSession(
    account: AccountRecord,
    tokenHash: Buffer,
    csrfTokenHash: Buffer,
    expiresAt: Date,
    metadata: RequestMetadata,
  ): Promise<string> {
    return this.database.transaction(async (client) => {
      const sessionId = randomUUID();
      await client.query(
        `UPDATE public.auth_accounts
         SET account_status = 'active',
             last_login_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = $1`,
        [account.accountId],
      );
      await client.query(
        `INSERT INTO public.auth_sessions (
           session_id,
           account_id,
           token_hash,
           csrf_token_hash,
           expires_at,
           ip_address,
           user_agent
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessionId,
          account.accountId,
          tokenHash,
          csrfTokenHash,
          expiresAt,
          metadata.ipAddress,
          metadata.userAgent,
        ],
      );
      await this.insertAudit(
        client,
        'login_succeeded',
        account.accountId,
        account.accountId,
        {},
        metadata,
      );
      return sessionId;
    });
  }

  async findActiveSession(tokenHash: Buffer): Promise<AuthenticatedUser | null> {
    const result = await this.database.query<SessionRow>(
      `SELECT
         session.session_id,
         session.csrf_token_hash,
         account.account_id,
         account.pers_no,
         account.display_name,
         account.login_email,
         account.password_hash,
         account.must_change_password,
         account.account_status,
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
       GROUP BY session.session_id, account.account_id`,
      [tokenHash],
    );

    const row = result.rows[0];
    if (!row) return null;

    await this.database.query(
      `UPDATE public.auth_sessions
       SET last_seen_at = CURRENT_TIMESTAMP
       WHERE session_id = $1
         AND (last_seen_at IS NULL OR last_seen_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes')`,
      [row.session_id],
    );

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

  async changePasswordAndRotateSession(
    user: AuthenticatedUser,
    passwordHash: string,
    tokenHash: Buffer,
    csrfTokenHash: Buffer,
    expiresAt: Date,
    metadata: RequestMetadata,
  ): Promise<string> {
    return this.database.transaction(async (client) => {
      await client.query(
        `UPDATE public.auth_accounts
         SET password_hash = $2,
             must_change_password = FALSE,
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = $1`,
        [user.accountId, passwordHash],
      );
      await client.query(
        `UPDATE public.auth_sessions
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_reason = 'password_changed'
         WHERE account_id = $1 AND revoked_at IS NULL`,
        [user.accountId],
      );

      const sessionId = randomUUID();
      await client.query(
        `INSERT INTO public.auth_sessions (
           session_id,
           account_id,
           token_hash,
           csrf_token_hash,
           expires_at,
           ip_address,
           user_agent
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessionId,
          user.accountId,
          tokenHash,
          csrfTokenHash,
          expiresAt,
          metadata.ipAddress,
          metadata.userAgent,
        ],
      );
      await this.insertAudit(
        client,
        'password_changed',
        user.accountId,
        user.accountId,
        {},
        metadata,
      );
      return sessionId;
    });
  }

  async getPasswordHash(accountId: string): Promise<string | null> {
    const result = await this.database.query<{ password_hash: string }>(
      `SELECT password_hash
       FROM public.auth_accounts
       WHERE account_id = $1`,
      [accountId],
    );
    return result.rows[0]?.password_hash ?? null;
  }

  async revokeSession(
    user: AuthenticatedUser,
    metadata: RequestMetadata,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        `UPDATE public.auth_sessions
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_reason = 'logout'
         WHERE session_id = $1 AND revoked_at IS NULL`,
        [user.sessionId],
      );
      await this.insertAudit(
        client,
        'logout',
        user.accountId,
        user.accountId,
        {},
        metadata,
      );
    });
  }

  private insertAudit(
    client: PoolClient,
    eventType: string,
    actorAccountId: string | null,
    targetAccountId: string | null,
    eventDetails: Record<string, unknown>,
    metadata: RequestMetadata = { ipAddress: null, userAgent: null },
  ): Promise<unknown> {
    return client.query(
      `INSERT INTO public.security_audit_log (
         event_type,
         actor_account_id,
         target_account_id,
         event_details,
         ip_address,
         user_agent
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        eventType,
        actorAccountId,
        targetAccountId,
        eventDetails,
        metadata.ipAddress,
        metadata.userAgent,
      ],
    );
  }
}