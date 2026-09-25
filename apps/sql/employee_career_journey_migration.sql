BEGIN;

CREATE TABLE public.employee_career_journey (
    event_id                    UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    pers_no                     BIGINT NOT NULL CHECK (pers_no > 0),
    event_month                 DATE NOT NULL CHECK (EXTRACT(DAY FROM event_month) = 1),
    event_type                  TEXT NOT NULL
                                CHECK (event_type IN ('entry_to_ps', 'internal_ps_change', 'manual')),
    old_organisational_area_pa  TEXT,
    new_organisational_area_pa  TEXT,
    old_organizational_unit     TEXT,
    new_organizational_unit     TEXT,
    old_ps_group                TEXT,
    new_ps_group                TEXT,
    source                      TEXT NOT NULL CHECK (source IN ('rbin', 'manual')),
    source_import_id            BIGINT
                                REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    notes                       TEXT CHECK (notes IS NULL OR CHAR_LENGTH(notes) <= 1000),
    is_reviewed                 BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_account_id       UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    updated_by_account_id       UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    deleted_by_account_id       UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                  TIMESTAMPTZ,

    UNIQUE (pers_no, event_month),
    CHECK ((source = 'rbin') = (source_import_id IS NOT NULL)),
    CHECK ((deleted_at IS NULL) = (deleted_by_account_id IS NULL)),
    CHECK (updated_at >= created_at),
    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

CREATE INDEX employee_career_journey_timeline_idx
    ON public.employee_career_journey (pers_no, event_month DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX employee_career_journey_recalculation_idx
    ON public.employee_career_journey (event_month, source, is_reviewed);

ALTER TABLE public.security_audit_log
    DROP CONSTRAINT security_audit_log_event_type_check,
    ADD CONSTRAINT security_audit_log_event_type_check CHECK (
        event_type IN (
            'account_created', 'account_activated', 'account_deactivated',
            'login_succeeded', 'login_failed', 'account_locked', 'logout',
            'password_changed', 'password_reset', 'role_changed',
            'sessions_revoked', 'rbin_exception_created',
            'rbin_exception_updated', 'rbin_exception_deleted',
            'career_event_created', 'career_event_updated',
            'career_event_deleted'
        )
    );

COMMIT;