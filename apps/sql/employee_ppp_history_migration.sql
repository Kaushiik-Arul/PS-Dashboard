BEGIN;

CREATE TABLE public.employee_ppp_history_imports (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    imported_by         UUID NOT NULL
                        REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
    file_name           TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash           TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    current_year        INTEGER NOT NULL CHECK (current_year BETWEEN 2000 AND 9999),
    source_rows         INTEGER NOT NULL CHECK (source_rows BETWEEN 1 AND 25000),
    imported_employees  INTEGER NOT NULL CHECK (imported_employees >= 0),
    skipped_rows        INTEGER NOT NULL CHECK (skipped_rows >= 0),
    yearly_rows         INTEGER NOT NULL CHECK (yearly_rows = imported_employees * 3),
    status              TEXT NOT NULL DEFAULT 'processing'
                        CHECK (status IN ('processing', 'completed', 'failed')),
    imported_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMPTZ,

    CHECK (imported_employees + skipped_rows = source_rows),
    CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE INDEX employee_ppp_history_imports_created_idx
    ON public.employee_ppp_history_imports (imported_at DESC);

CREATE TABLE public.employee_ppp_history (
    pers_no         BIGINT NOT NULL CHECK (pers_no > 0),
    calendar_year   INTEGER NOT NULL CHECK (calendar_year BETWEEN 2000 AND 9999),
    performance     TEXT,
    position        TEXT,
    person          TEXT,
    tcl             TEXT,
    import_id       BIGINT NOT NULL
                    REFERENCES public.employee_ppp_history_imports(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (pers_no, calendar_year),
    CHECK (performance IS NULL OR NULLIF(BTRIM(performance), '') IS NOT NULL),
    CHECK (position IS NULL OR NULLIF(BTRIM(position), '') IS NOT NULL),
    CHECK (person IS NULL OR NULLIF(BTRIM(person), '') IS NOT NULL),
    CHECK (tcl IS NULL OR NULLIF(BTRIM(tcl), '') IS NOT NULL)
);

CREATE INDEX employee_ppp_history_employee_idx
    ON public.employee_ppp_history (pers_no, calendar_year DESC);

CREATE TABLE public.employee_ppp_history_import_previews (
    preview_id          UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    uploaded_by         UUID NOT NULL
                        REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
    file_name           TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash           TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    current_year        INTEGER NOT NULL CHECK (current_year BETWEEN 2000 AND 9999),
    total_rows          INTEGER NOT NULL CHECK (total_rows BETWEEN 1 AND 25000),
    valid_rows          INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
    warning_rows        INTEGER NOT NULL DEFAULT 0 CHECK (warning_rows >= 0),
    invalid_rows        INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
    status              TEXT NOT NULL DEFAULT 'ready'
                        CHECK (status IN ('ready', 'committed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',

    CHECK (valid_rows + warning_rows + invalid_rows = total_rows),
    CHECK (expires_at > created_at)
);

CREATE INDEX employee_ppp_history_previews_owner_idx
    ON public.employee_ppp_history_import_previews (uploaded_by, created_at DESC);

CREATE INDEX employee_ppp_history_previews_expiry_idx
    ON public.employee_ppp_history_import_previews (expires_at)
    WHERE status = 'ready';

CREATE TABLE public.employee_ppp_history_import_preview_rows (
    preview_id      UUID NOT NULL
                    REFERENCES public.employee_ppp_history_import_previews(preview_id) ON DELETE CASCADE,
    row_number      INTEGER NOT NULL CHECK (row_number >= 2),
    row_data        JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
    issues          JSONB NOT NULL DEFAULT '[]' CHECK (JSONB_TYPEOF(issues) = 'array'),
    is_valid        BOOLEAN NOT NULL,
    has_warning     BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (preview_id, row_number),
    CHECK (NOT has_warning OR is_valid)
);

CREATE INDEX employee_ppp_history_preview_rows_filter_idx
    ON public.employee_ppp_history_import_preview_rows
    (preview_id, is_valid, has_warning, row_number);

COMMIT;

-- Scheduled cleanup query:
-- DELETE FROM public.employee_ppp_history_import_previews
-- WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP;