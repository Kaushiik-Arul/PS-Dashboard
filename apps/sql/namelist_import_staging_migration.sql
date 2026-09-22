BEGIN;

CREATE TABLE public.namelist_import_previews (
    preview_id          UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    uploaded_by         UUID NOT NULL
                        REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
    reporting_month     DATE NOT NULL
                        CHECK (EXTRACT(DAY FROM reporting_month) = 1),
    file_name           TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash           TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    total_rows          INTEGER NOT NULL CHECK (total_rows BETWEEN 1 AND 25000),
    valid_rows          INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
    invalid_rows        INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
    status              TEXT NOT NULL DEFAULT 'ready'
                        CHECK (status IN ('ready', 'committing', 'committed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',

    CHECK (valid_rows + invalid_rows = total_rows),
    CHECK (expires_at > created_at)
);

CREATE INDEX namelist_import_previews_owner_idx
    ON public.namelist_import_previews (uploaded_by, created_at DESC);

CREATE INDEX namelist_import_previews_expiry_idx
    ON public.namelist_import_previews (expires_at)
    WHERE status = 'ready';

CREATE TABLE public.namelist_import_preview_rows (
    preview_id      UUID NOT NULL
                    REFERENCES public.namelist_import_previews(preview_id) ON DELETE CASCADE,
    row_number      INTEGER NOT NULL CHECK (row_number >= 2),
    row_data        JSONB NOT NULL CHECK (JSONB_TYPEOF(row_data) = 'object'),
    issues          JSONB NOT NULL DEFAULT '[]' CHECK (JSONB_TYPEOF(issues) = 'array'),
    is_valid        BOOLEAN NOT NULL,

    PRIMARY KEY (preview_id, row_number)
);

CREATE INDEX namelist_import_preview_rows_filter_idx
    ON public.namelist_import_preview_rows (preview_id, is_valid, row_number);

COMMIT;

-- Scheduled cleanup query:
-- DELETE FROM public.namelist_import_previews
-- WHERE status = 'ready' AND expires_at <= CURRENT_TIMESTAMP;