BEGIN;

CREATE TABLE public.ps_exit_imports (
    import_id              UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    file_name              TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
    file_hash              TEXT NOT NULL CHECK (file_hash ~ '^[0-9a-f]{64}$'),
    row_count              INTEGER NOT NULL CHECK (row_count > 0),
    minimum_lwd            DATE NOT NULL,
    maximum_lwd            DATE NOT NULL,
    retained_month         DATE NOT NULL CHECK (EXTRACT(DAY FROM retained_month) = 1),
    imported_by_account_id UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    imported_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (minimum_lwd <= maximum_lwd),
    CHECK (retained_month = DATE_TRUNC('month', maximum_lwd)::date)
);

CREATE INDEX ps_exit_imports_imported_at_idx
    ON public.ps_exit_imports (imported_at DESC);

CREATE TABLE public.ps_exit_previews (
    preview_id             UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    uploaded_by_account_id UUID NOT NULL REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
    file_name              TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
    file_hash              TEXT NOT NULL CHECK (file_hash ~ '^[0-9a-f]{64}$'),
    status                 TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'committed')),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
    CHECK (expires_at > created_at)
);

CREATE INDEX ps_exit_previews_owner_status_idx
    ON public.ps_exit_previews (uploaded_by_account_id, status, expires_at);

CREATE TABLE public.ps_exit_preview_rows (
    preview_id  UUID NOT NULL REFERENCES public.ps_exit_previews(preview_id) ON DELETE CASCADE,
    row_number  INTEGER NOT NULL CHECK (row_number > 0),
    row_data    JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
    issues      JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (JSONB_TYPEOF(issues) = 'array'),
    PRIMARY KEY (preview_id, row_number)
);

CREATE TABLE public.ps_exit_rows (
    row_id                     UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    import_id                  UUID NOT NULL REFERENCES public.ps_exit_imports(import_id) ON DELETE RESTRICT,
    source_row_number          INTEGER NOT NULL CHECK (source_row_number > 0),
    pers_no                    BIGINT NOT NULL CHECK (pers_no > 0),
    personnel_number          TEXT,
    ps_group                   TEXT,
    gender_key                 TEXT,
    filter_value               TEXT,
    reason_for_action          TEXT NOT NULL CHECK (BTRIM(reason_for_action) <> ''),
    detailed_reason_approved   TEXT,
    org_unit                   TEXT,
    range_value                TEXT,
    initiated_date             DATE,
    lwd                        DATE NOT NULL,
    e_separation_request_no    TEXT,
    to_org_unit                TEXT,
    classification             TEXT NOT NULL CHECK (classification IN ('resignation', 'retirement', 'out_of_ps_transfer')),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (import_id, source_row_number),
    UNIQUE (pers_no, lwd)
);

CREATE INDEX ps_exit_rows_lwd_idx ON public.ps_exit_rows (lwd DESC);
CREATE INDEX ps_exit_rows_employee_idx ON public.ps_exit_rows (pers_no, lwd DESC);

ALTER TABLE public.employee_attrition_events
    ALTER COLUMN run_id DROP NOT NULL,
    ALTER COLUMN current_import_id DROP NOT NULL,
    ADD COLUMN ps_exit_import_id UUID REFERENCES public.ps_exit_imports(import_id) ON DELETE RESTRICT,
    ADD COLUMN exit_lwd DATE,
    ADD COLUMN exit_reason TEXT;

ALTER TABLE public.employee_attrition_events
    ADD CONSTRAINT employee_attrition_events_source_reference_check CHECK (
        (source = 'rbin' AND run_id IS NOT NULL AND current_import_id IS NOT NULL AND ps_exit_import_id IS NULL)
        OR (source = 'ps_exit' AND ps_exit_import_id IS NOT NULL)
        OR (source = 'manual' AND ps_exit_import_id IS NULL)
    );

CREATE INDEX employee_attrition_events_ps_exit_import_idx
    ON public.employee_attrition_events (ps_exit_import_id)
    WHERE ps_exit_import_id IS NOT NULL;

COMMIT;