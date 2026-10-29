BEGIN;

CREATE TABLE public.job_descriptions (
    job_description_id     UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    jd_id                  TEXT NOT NULL CHECK (
                               NULLIF(BTRIM(jd_id), '') IS NOT NULL
                               AND jd_id = BTRIM(jd_id)
                               AND CHAR_LENGTH(jd_id) <= 100
                           ),
    role_title             TEXT NOT NULL CHECK (
                               NULLIF(BTRIM(role_title), '') IS NOT NULL
                               AND role_title = BTRIM(role_title)
                               AND CHAR_LENGTH(role_title) <= 200
                           ),
    created_by_account_id  UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    updated_by_account_id  UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (jd_id),
    CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX job_descriptions_normalized_jd_id_idx
    ON public.job_descriptions (LOWER(jd_id));

CREATE INDEX job_descriptions_role_title_idx
    ON public.job_descriptions (LOWER(role_title));

CREATE TABLE public.employee_jd_imports (
    import_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporting_month    DATE NOT NULL CHECK (EXTRACT(DAY FROM reporting_month) = 1),
    imported_by       UUID NOT NULL
                      REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
    file_name         TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash         TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    total_rows        INTEGER NOT NULL CHECK (total_rows BETWEEN 1 AND 25000),
    status            TEXT NOT NULL DEFAULT 'processing'
                      CHECK (status IN ('processing', 'completed', 'failed')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMPTZ,

    CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE INDEX employee_jd_imports_created_idx
    ON public.employee_jd_imports (created_at DESC);

CREATE TABLE public.employee_jd_import_previews (
    preview_id        UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    reporting_month   DATE NOT NULL CHECK (EXTRACT(DAY FROM reporting_month) = 1),
    uploaded_by       UUID NOT NULL
                      REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
    file_name         TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash         TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    total_rows        INTEGER NOT NULL CHECK (total_rows BETWEEN 1 AND 25000),
    valid_rows        INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
    invalid_rows      INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
    status            TEXT NOT NULL DEFAULT 'ready'
                      CHECK (status IN ('ready', 'committed')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',

    CHECK (valid_rows + invalid_rows = total_rows),
    CHECK (expires_at > created_at)
);

CREATE INDEX employee_jd_import_previews_owner_idx
    ON public.employee_jd_import_previews (uploaded_by, created_at DESC);

CREATE INDEX employee_jd_import_previews_expiry_idx
    ON public.employee_jd_import_previews (expires_at)
    WHERE status = 'ready';

CREATE TABLE public.employee_jd_import_preview_rows (
    preview_id      UUID NOT NULL
                    REFERENCES public.employee_jd_import_previews(preview_id) ON DELETE CASCADE,
    row_number      INTEGER NOT NULL CHECK (row_number >= 2),
    row_data        JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
    issues          JSONB NOT NULL DEFAULT '[]' CHECK (JSONB_TYPEOF(issues) = 'array'),
    is_valid        BOOLEAN NOT NULL,

    PRIMARY KEY (preview_id, row_number)
);

CREATE INDEX employee_jd_import_preview_rows_filter_idx
    ON public.employee_jd_import_preview_rows (preview_id, is_valid, row_number);

CREATE TABLE public.employee_jd_assignments (
    pers_no                BIGINT PRIMARY KEY CHECK (pers_no > 0),
    jd_id                  TEXT NOT NULL
                           REFERENCES public.job_descriptions(jd_id)
                           ON UPDATE CASCADE ON DELETE RESTRICT,
    effective_date         DATE NOT NULL,
    source                 TEXT NOT NULL CHECK (source IN ('upload', 'manual')),
    source_import_id       BIGINT
                           REFERENCES public.employee_jd_imports(import_id) ON DELETE RESTRICT,
    updated_by_account_id  UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK ((source = 'upload') = (source_import_id IS NOT NULL)),
    CHECK (updated_at >= created_at)
);

CREATE INDEX employee_jd_assignments_jd_idx
    ON public.employee_jd_assignments (jd_id);

CREATE TABLE public.employee_jd_movements (
    movement_id            UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    pers_no                BIGINT NOT NULL CHECK (pers_no > 0),
    old_jd_id              TEXT,
    old_role_title         TEXT,
    new_jd_id              TEXT,
    new_role_title         TEXT,
    effective_date         DATE NOT NULL,
    occurred_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source                 TEXT NOT NULL CHECK (source IN ('upload', 'manual')),
    source_import_id       BIGINT
                           REFERENCES public.employee_jd_imports(import_id) ON DELETE RESTRICT,
    changed_by_account_id  UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (old_jd_id IS NOT NULL OR new_jd_id IS NOT NULL),
    CHECK (old_jd_id IS DISTINCT FROM new_jd_id),
    CHECK ((old_jd_id IS NULL) = (old_role_title IS NULL)),
    CHECK ((new_jd_id IS NULL) = (new_role_title IS NULL)),
    CHECK ((source = 'upload') = (source_import_id IS NOT NULL))
);

CREATE INDEX employee_jd_movements_employee_idx
    ON public.employee_jd_movements (pers_no, effective_date DESC, occurred_at DESC);

CREATE INDEX employee_jd_movements_filter_idx
    ON public.employee_jd_movements (effective_date DESC, source);

CREATE INDEX employee_jd_movements_old_jd_idx
    ON public.employee_jd_movements (old_jd_id)
    WHERE old_jd_id IS NOT NULL;

CREATE INDEX employee_jd_movements_new_jd_idx
    ON public.employee_jd_movements (new_jd_id)
    WHERE new_jd_id IS NOT NULL;

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
            'career_event_deleted', 'job_description_created',
            'job_description_updated', 'job_description_deleted',
            'employee_jd_import_committed', 'employee_jd_assignment_updated'
        )
    );

COMMIT;

-- Scheduled cleanup query:
-- DELETE FROM public.employee_jd_import_previews
-- WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP;