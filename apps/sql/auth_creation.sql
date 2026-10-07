BEGIN;

CREATE TABLE public.auth_accounts (
    account_id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    pers_no BIGINT UNIQUE,
    display_name TEXT NOT NULL,
    login_email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    account_status TEXT NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT auth_accounts_login_email_check
        CHECK (
            login_email = LOWER(BTRIM(login_email))
            AND login_email <> ''
        ),
    CONSTRAINT auth_accounts_display_name_check
        CHECK (NULLIF(BTRIM(display_name), '') IS NOT NULL),
    CONSTRAINT auth_accounts_password_hash_check
        CHECK (password_hash LIKE '$argon2id$%'),
    CONSTRAINT auth_accounts_status_check
        CHECK (account_status IN ('active', 'inactive')),
    CONSTRAINT auth_accounts_timestamps_check
        CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX auth_accounts_login_email_unique
    ON public.auth_accounts (login_email);

CREATE TABLE public.master_access (
    access_assignment_id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    account_id UUID NOT NULL
        REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,

    role TEXT NOT NULL,
    assigned_range TEXT,
    assigned_org_unit TEXT,

    created_by_account_id UUID
        REFERENCES public.auth_accounts(account_id),
    updated_by_account_id UUID
        REFERENCES public.auth_accounts(account_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT master_access_role_check CHECK (
        role IN (
            'hrbp',
            'admin',
            'range_head',
            'department_head',
            'sub_department_head'
        )
    ),
    CONSTRAINT master_access_scope_check CHECK (
        (role IN ('hrbp', 'admin')
            AND assigned_range IS NULL
            AND assigned_org_unit IS NULL)
        OR
        (role = 'range_head'
            AND NULLIF(BTRIM(assigned_range), '') IS NOT NULL
            AND assigned_org_unit IS NULL)
        OR
        (role IN ('department_head', 'sub_department_head')
            AND NULLIF(BTRIM(assigned_range), '') IS NOT NULL
            AND NULLIF(BTRIM(assigned_org_unit), '') IS NOT NULL)
    ),
    CONSTRAINT master_access_timestamps_check
        CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX master_access_assignment_unique
    ON public.master_access (
        account_id,
        role,
        COALESCE(assigned_range, ''),
        COALESCE(assigned_org_unit, '')
    );

CREATE INDEX master_access_account_idx
    ON public.master_access (account_id);

CREATE INDEX master_access_scope_idx
    ON public.master_access (assigned_range, assigned_org_unit)
    WHERE assigned_range IS NOT NULL;

CREATE TABLE public.auth_sessions (
    session_id UUID PRIMARY KEY,
    account_id UUID NOT NULL
        REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,

    token_hash BYTEA NOT NULL UNIQUE,
    csrf_token_hash BYTEA NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,

    ip_address INET,
    user_agent TEXT,

    CONSTRAINT auth_sessions_token_hash_check
        CHECK (OCTET_LENGTH(token_hash) = 32),
    CONSTRAINT auth_sessions_csrf_hash_check
        CHECK (OCTET_LENGTH(csrf_token_hash) = 32),
    CONSTRAINT auth_sessions_expiry_check
        CHECK (expires_at > created_at),
    CONSTRAINT auth_sessions_last_seen_check
        CHECK (last_seen_at IS NULL OR last_seen_at >= created_at),
    CONSTRAINT auth_sessions_revoked_at_check
        CHECK (revoked_at IS NULL OR revoked_at >= created_at),
    CONSTRAINT auth_sessions_revoked_reason_check
        CHECK (
            (revoked_at IS NULL AND revoked_reason IS NULL)
            OR (revoked_at IS NOT NULL AND NULLIF(BTRIM(revoked_reason), '') IS NOT NULL)
        )
);

CREATE INDEX auth_sessions_account_idx
    ON public.auth_sessions (account_id, expires_at DESC);

CREATE INDEX auth_sessions_active_idx
    ON public.auth_sessions (token_hash)
    WHERE revoked_at IS NULL;

CREATE TABLE public.security_audit_log (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    event_type TEXT NOT NULL,
    actor_account_id UUID,
    target_account_id UUID,
    event_details JSONB NOT NULL DEFAULT '{}',

    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (actor_account_id)
        REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,

    FOREIGN KEY (target_account_id)
        REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,

    CONSTRAINT security_audit_log_event_type_check CHECK (
        event_type IN (
            'account_created',
            'account_activated',
            'account_deactivated',
            'login_succeeded',
            'login_failed',
            'account_locked',
            'logout',
            'password_changed',
            'password_reset',
            'role_changed',
            'sessions_revoked',
            'rbin_exception_created',
            'rbin_exception_updated',
            'rbin_exception_deleted',
            'career_event_created',
            'career_event_updated',
            'career_event_deleted'
        )
    ),
    CONSTRAINT security_audit_log_details_check
        CHECK (JSONB_TYPEOF(event_details) = 'object')
);

CREATE INDEX security_audit_actor_idx
    ON public.security_audit_log (actor_account_id, created_at DESC);

CREATE INDEX security_audit_target_idx
    ON public.security_audit_log (target_account_id, created_at DESC);

COMMIT;
