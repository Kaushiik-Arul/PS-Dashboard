BEGIN;

CREATE TABLE public.employee_headcount_imports (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    imported_by         UUID NOT NULL
                        REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
    file_name           TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash           TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    included_sheets     INTEGER NOT NULL CHECK (included_sheets > 0),
    ignored_sheets      INTEGER NOT NULL CHECK (ignored_sheets >= 0),
    imported_months     INTEGER NOT NULL CHECK (imported_months > 0),
    replaced_months     INTEGER NOT NULL CHECK (replaced_months >= 0),
    status              TEXT NOT NULL DEFAULT 'processing'
                        CHECK (status IN ('processing', 'completed')),
    imported_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMPTZ,

    CHECK (replaced_months <= imported_months),
    CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE INDEX employee_headcount_imports_created_idx
    ON public.employee_headcount_imports (imported_at DESC);

CREATE TABLE public.employee_headcount_months (
    reporting_month     DATE PRIMARY KEY
                        CHECK (EXTRACT(DAY FROM reporting_month) = 1),
    total_headcount     INTEGER NOT NULL CHECK (total_headcount >= 0),
    source_import_id    BIGINT NOT NULL
                        REFERENCES public.employee_headcount_imports(id) ON DELETE RESTRICT,
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.employee_headcount_by_range (
    reporting_month     DATE NOT NULL
                        REFERENCES public.employee_headcount_months(reporting_month) ON DELETE CASCADE,
    range_key           TEXT NOT NULL,
    range_name          TEXT NOT NULL,
    headcount           INTEGER NOT NULL CHECK (headcount >= 0),

    PRIMARY KEY (reporting_month, range_key),
    CHECK (NULLIF(BTRIM(range_key), '') IS NOT NULL),
    CHECK (range_key = UPPER(REGEXP_REPLACE(BTRIM(range_key), '[[:space:]]+', ' ', 'g'))),
    CHECK (NULLIF(BTRIM(range_name), '') IS NOT NULL),
    CHECK (range_name = REGEXP_REPLACE(BTRIM(range_name), '[[:space:]]+', ' ', 'g'))
);

CREATE INDEX employee_headcount_by_range_lookup_idx
    ON public.employee_headcount_by_range (range_key, reporting_month);

CREATE TABLE public.employee_headcount_import_previews (
    preview_id          UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    uploaded_by         UUID NOT NULL
                        REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
    file_name           TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash           TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    preview_payload     JSONB NOT NULL CHECK (JSONB_TYPEOF(preview_payload) = 'object'),
    has_errors          BOOLEAN NOT NULL,
    existing_months     INTEGER NOT NULL CHECK (existing_months >= 0),
    status              TEXT NOT NULL DEFAULT 'ready'
                        CHECK (status IN ('ready', 'committing', 'committed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',

    CHECK (expires_at > created_at)
);

CREATE INDEX employee_headcount_previews_owner_idx
    ON public.employee_headcount_import_previews (uploaded_by, created_at DESC);

CREATE INDEX employee_headcount_previews_expiry_idx
    ON public.employee_headcount_import_previews (expires_at)
    WHERE status = 'ready';

COMMIT;

-- Scheduled cleanup query:
-- DELETE FROM public.employee_headcount_import_previews
-- WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP;