BEGIN;

CREATE TABLE IF NOT EXISTS public.rbin_employee_column_exceptions (
    exception_id           UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    pers_no                BIGINT NOT NULL CHECK (pers_no > 0),
    column_name            TEXT NOT NULL CHECK (column_name IN (
                               'employee_group', 'lp', 'esgrp', 'employee_subgroup',
                               'ps_group', 'organizational_unit', 'range', 'function',
                               'organisational_area_pa', 'gender_key', 'location', 'pa',
                               'personnel_area', 'psubarea', 'personnel_subarea', 'nt_id',
                               'global_id', 'cost_center', 'birth_date', 'joining_date',
                               'entry_for_retirement', 'designation_text', 'hrbp_global_id',
                               'hrbp2_global_id', 'official_email', 'technical_entry_date',
                               'direct_or_indirect'
                           )),
    fixed_value            TEXT NOT NULL CHECK (
                               NULLIF(BTRIM(fixed_value), '') IS NOT NULL
                               AND CHAR_LENGTH(fixed_value) <= 500
                           ),
    created_by_account_id  UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    updated_by_account_id  UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (pers_no, column_name),
    CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS rbin_employee_column_exceptions_pers_no_idx
    ON public.rbin_employee_column_exceptions (pers_no);

CREATE INDEX IF NOT EXISTS rbin_employee_column_exceptions_column_idx
    ON public.rbin_employee_column_exceptions (column_name, pers_no);

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

ALTER TABLE public.rbin_staging_rows
    DROP CONSTRAINT rbin_staging_rows_range_source_check,
    ADD CONSTRAINT rbin_staging_rows_range_source_check
        CHECK (range_source IN ('mapping', 'exception', 'manual', 'missing')),
    DROP CONSTRAINT rbin_staging_rows_function_source_check,
    ADD CONSTRAINT rbin_staging_rows_function_source_check
        CHECK (function_source IN ('mapping', 'exception', 'manual', 'missing'));

COMMIT;