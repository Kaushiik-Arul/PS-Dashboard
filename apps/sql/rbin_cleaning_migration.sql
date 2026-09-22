BEGIN;

ALTER TABLE public.rbin_namelist_imports
    ADD COLUMN uploaded_by UUID,
    ADD COLUMN file_hash TEXT,
    ADD COLUMN ps_rows INTEGER,
    ADD COLUMN excluded_rows INTEGER,
    ADD COLUMN valid_rows INTEGER,
    ADD COLUMN invalid_rows INTEGER,
    ADD COLUMN failure_message TEXT,
    ADD COLUMN created_at TIMESTAMPTZ,
    ADD COLUMN completed_at TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT legacy.id
        FROM public.rbin_namelist_imports legacy
        LEFT JOIN public.auth_accounts account
            ON legacy.imported_by = account.account_id::text
            OR legacy.imported_by = account.pers_no::text
            OR LOWER(BTRIM(legacy.imported_by)) = account.login_email
        GROUP BY legacy.id
        HAVING COUNT(account.account_id) <> 1
    ) THEN
        RAISE EXCEPTION
            'RBIN migration stopped: every legacy imported_by value must match exactly one auth account UUID, personnel number, or login email.';
    END IF;
END;
$$;

UPDATE public.rbin_namelist_imports legacy
SET uploaded_by = account.account_id
FROM public.auth_accounts account
WHERE legacy.imported_by = account.account_id::text
   OR legacy.imported_by = account.pers_no::text
   OR LOWER(BTRIM(legacy.imported_by)) = account.login_email;

UPDATE public.rbin_namelist_imports
SET file_hash = REPEAT('0', 64),
    ps_rows = CASE WHEN status = 'completed' THEN total_rows END,
    excluded_rows = CASE WHEN status = 'completed' THEN 0 END,
    valid_rows = CASE WHEN status = 'completed' THEN total_rows END,
    invalid_rows = CASE WHEN status = 'completed' THEN 0 END,
    failure_message = CASE WHEN status = 'failed' THEN 'Legacy import failed.' END,
    created_at = imported_at,
    completed_at = CASE WHEN status = 'completed' THEN imported_at END,
    status = CASE WHEN status = 'completed' THEN 'ready' ELSE status END;

ALTER TABLE public.rbin_namelist_imports
    DROP CONSTRAINT IF EXISTS rbin_namelist_imports_status_check,
    DROP CONSTRAINT IF EXISTS rbin_namelis_imports_status_check,
    DROP CONSTRAINT IF EXISTS rbin_namelist_imports_check,
    DROP CONSTRAINT IF EXISTS rbin_namelis_imports_check,
    DROP COLUMN imported_by,
    DROP COLUMN imported_at,
    ALTER COLUMN uploaded_by SET NOT NULL,
    ALTER COLUMN file_hash SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ADD CONSTRAINT rbin_namelist_imports_uploaded_by_fkey
        FOREIGN KEY (uploaded_by)
        REFERENCES public.auth_accounts(account_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT rbin_namelist_imports_file_hash_check
        CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    ADD CONSTRAINT rbin_namelist_imports_ps_rows_check
        CHECK (ps_rows >= 0),
    ADD CONSTRAINT rbin_namelist_imports_excluded_rows_check
        CHECK (excluded_rows >= 0),
    ADD CONSTRAINT rbin_namelist_imports_valid_rows_check
        CHECK (valid_rows >= 0),
    ADD CONSTRAINT rbin_namelist_imports_invalid_rows_check
        CHECK (invalid_rows >= 0),
    ADD CONSTRAINT rbin_namelist_imports_status_check
        CHECK (status IN ('processing', 'ready', 'failed', 'legacy')),
    ADD CONSTRAINT rbin_namelist_imports_row_counts_check
        CHECK (ps_rows IS NULL OR excluded_rows IS NULL OR ps_rows + excluded_rows = total_rows),
    ADD CONSTRAINT rbin_namelist_imports_validity_counts_check
        CHECK (valid_rows IS NULL OR invalid_rows IS NULL OR valid_rows + invalid_rows = ps_rows),
    ADD CONSTRAINT rbin_namelist_imports_ready_check
        CHECK (
            status IN ('processing', 'failed', 'legacy')
            OR (
                total_rows IS NOT NULL
                AND ps_rows IS NOT NULL
                AND excluded_rows IS NOT NULL
                AND valid_rows IS NOT NULL
                AND invalid_rows IS NOT NULL
                AND completed_at IS NOT NULL
            )
        ),
    ADD CONSTRAINT rbin_namelist_imports_failure_check
        CHECK ((status = 'failed') = (failure_message IS NOT NULL)),
    ADD CONSTRAINT rbin_namelist_imports_timestamps_check
        CHECK (completed_at IS NULL OR completed_at >= created_at);

CREATE INDEX rbin_namelist_imports_owner_idx
    ON public.rbin_namelist_imports (uploaded_by, created_at DESC);

CREATE INDEX rbin_namelist_imports_status_idx
    ON public.rbin_namelist_imports (status, created_at DESC);

ALTER TABLE public.rbin_namelist
    ADD COLUMN import_id BIGINT,
    ADD COLUMN source_row_number INTEGER,
    ADD COLUMN raw_source_data JSONB,
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
DECLARE
    hrbp_count INTEGER;
    legacy_owner UUID;
    raw_count INTEGER;
    ps_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM public.rbin_namelist)
       AND NOT EXISTS (SELECT 1 FROM public.rbin_namelist_imports) THEN
        SELECT COUNT(DISTINCT account.account_id), MIN(account.account_id::text)::uuid
        INTO hrbp_count, legacy_owner
        FROM public.auth_accounts account
        JOIN public.master_access access ON access.account_id = account.account_id
        WHERE access.role = 'hrbp';

        IF hrbp_count <> 1 THEN
            RAISE EXCEPTION
                'RBIN migration stopped: an orphaned raw snapshot requires exactly one HRBP account owner; found %.',
                hrbp_count;
        END IF;

        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE LOWER(BTRIM(organisational_area_pa)) = 'ps')
        INTO raw_count, ps_count
        FROM public.rbin_namelist;

        INSERT INTO public.rbin_namelist_imports (
            reporting_month,
            uploaded_by,
            file_name,
            file_hash,
            total_rows,
            ps_rows,
            excluded_rows,
            status,
            created_at,
            completed_at
        ) VALUES (
            DATE_TRUNC('month', CURRENT_DATE)::date,
            legacy_owner,
            'legacy-rbin-snapshot',
            REPEAT('0', 64),
            raw_count,
            ps_count,
            raw_count - ps_count,
            'legacy',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    END IF;
END;
$$;

WITH latest_import AS (
    SELECT id
    FROM public.rbin_namelist_imports
    ORDER BY created_at DESC, id DESC
    LIMIT 1
),
numbered_rows AS (
    SELECT pers_no, (ROW_NUMBER() OVER (ORDER BY pers_no) + 1)::integer AS source_row_number
    FROM public.rbin_namelist
)
UPDATE public.rbin_namelist raw
SET import_id = latest_import.id,
    source_row_number = numbered_rows.source_row_number,
    raw_source_data = TO_JSONB(raw)
        - 'import_id'
        - 'source_row_number'
        - 'raw_source_data'
        - 'created_at'
FROM latest_import, numbered_rows
WHERE raw.pers_no = numbered_rows.pers_no;

ALTER TABLE public.rbin_namelist
    DROP CONSTRAINT rbin_namelist_pkey,
    ALTER COLUMN import_id SET NOT NULL,
    ALTER COLUMN source_row_number SET NOT NULL,
    ALTER COLUMN raw_source_data SET NOT NULL,
    ADD CONSTRAINT rbin_namelist_pkey PRIMARY KEY (import_id, source_row_number),
    ADD CONSTRAINT rbin_namelist_import_id_fkey
        FOREIGN KEY (import_id)
        REFERENCES public.rbin_namelist_imports(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT rbin_namelist_source_row_check
        CHECK (source_row_number >= 2),
    ADD CONSTRAINT rbin_namelist_raw_source_check
        CHECK (JSONB_TYPEOF(raw_source_data) = 'object');

CREATE INDEX rbin_namelist_pers_no_idx
    ON public.rbin_namelist (pers_no)
    WHERE pers_no IS NOT NULL;

CREATE INDEX rbin_namelist_org_unit_idx
    ON public.rbin_namelist (LOWER(BTRIM(organizational_unit)))
    WHERE NULLIF(BTRIM(organizational_unit), '') IS NOT NULL;

CREATE TABLE public.org_unit_range_mappings (
    mapping_id              UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    organizational_unit     TEXT NOT NULL CHECK (NULLIF(BTRIM(organizational_unit), '') IS NOT NULL),
    range_value             TEXT NOT NULL CHECK (NULLIF(BTRIM(range_value), '') IS NOT NULL),
    source_file_name        TEXT NOT NULL CHECK (NULLIF(BTRIM(source_file_name), '') IS NOT NULL),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX org_unit_range_mappings_key_idx
    ON public.org_unit_range_mappings (LOWER(BTRIM(organizational_unit)));

CREATE TABLE public.org_unit_function_mappings (
    mapping_id              UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    organizational_unit     TEXT NOT NULL CHECK (NULLIF(BTRIM(organizational_unit), '') IS NOT NULL),
    function_value          TEXT NOT NULL CHECK (NULLIF(BTRIM(function_value), '') IS NOT NULL),
    source_file_name        TEXT NOT NULL CHECK (NULLIF(BTRIM(source_file_name), '') IS NOT NULL),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX org_unit_function_mappings_key_idx
    ON public.org_unit_function_mappings (LOWER(BTRIM(organizational_unit)));

CREATE TABLE public.rbin_staging_batches (
    batch_id                UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    import_id               BIGINT NOT NULL UNIQUE
                            REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    uploaded_by             UUID NOT NULL
                            REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
    file_name               TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash               TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'ready_for_export', 'exported')),
    total_raw_rows          INTEGER NOT NULL CHECK (total_raw_rows > 0),
    staged_rows             INTEGER NOT NULL CHECK (staged_rows >= 0),
    excluded_rows           INTEGER NOT NULL CHECK (excluded_rows >= 0),
    valid_rows              INTEGER NOT NULL CHECK (valid_rows >= 0),
    invalid_rows            INTEGER NOT NULL CHECK (invalid_rows >= 0),
    new_rows                INTEGER NOT NULL CHECK (new_rows >= 0),
    changed_rows            INTEGER NOT NULL CHECK (changed_rows >= 0),
    unchanged_rows          INTEGER NOT NULL CHECK (unchanged_rows >= 0),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalized_at            TIMESTAMPTZ,
    first_exported_at       TIMESTAMPTZ,
    last_exported_at        TIMESTAMPTZ,

    CHECK (staged_rows + excluded_rows = total_raw_rows),
    CHECK (valid_rows + invalid_rows = staged_rows),
    CHECK (new_rows + changed_rows + unchanged_rows = staged_rows),
    CHECK (updated_at >= created_at),
    CHECK (finalized_at IS NULL OR finalized_at >= created_at),
    CHECK (first_exported_at IS NULL OR first_exported_at >= finalized_at),
    CHECK (last_exported_at IS NULL OR last_exported_at >= first_exported_at),
    CHECK ((status = 'draft') = (finalized_at IS NULL)),
    CHECK (status <> 'exported' OR first_exported_at IS NOT NULL)
);

CREATE INDEX rbin_staging_batches_owner_idx
    ON public.rbin_staging_batches (uploaded_by, created_at DESC);

CREATE INDEX rbin_staging_batches_status_idx
    ON public.rbin_staging_batches (status, created_at DESC);

CREATE TABLE public.rbin_staging_rows (
    batch_id                UUID NOT NULL
                            REFERENCES public.rbin_staging_batches(batch_id) ON DELETE RESTRICT,
    source_row_number       INTEGER NOT NULL CHECK (source_row_number >= 2),
    original_data           JSONB NOT NULL CHECK (JSONB_TYPEOF(original_data) = 'object'),
    current_data            JSONB NOT NULL CHECK (JSONB_TYPEOF(current_data) = 'object'),
    validation_issues       JSONB NOT NULL DEFAULT '[]'::jsonb
                            CHECK (JSONB_TYPEOF(validation_issues) = 'array'),
    is_valid                BOOLEAN NOT NULL,
    range_source            TEXT NOT NULL CHECK (range_source IN ('mapping', 'manual', 'missing')),
    function_source         TEXT NOT NULL CHECK (function_source IN ('mapping', 'manual', 'missing')),
    comparison_status       TEXT NOT NULL CHECK (comparison_status IN ('new', 'changed', 'unchanged')),
    baseline_employee_data  JSONB CHECK (
                                baseline_employee_data IS NULL
                                OR JSONB_TYPEOF(baseline_employee_data) = 'object'
                            ),
    changed_columns         TEXT[] NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (batch_id, source_row_number),
    CHECK (updated_at >= created_at),
    CHECK ((comparison_status = 'new') = (baseline_employee_data IS NULL)),
    CHECK ((comparison_status = 'changed') = (CARDINALITY(changed_columns) > 0))
);

CREATE INDEX rbin_staging_rows_filter_idx
    ON public.rbin_staging_rows (
        batch_id,
        is_valid,
        comparison_status,
        source_row_number
    );

CREATE TABLE public.rbin_staging_exports (
    export_id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id                UUID NOT NULL
                            REFERENCES public.rbin_staging_batches(batch_id) ON DELETE RESTRICT,
    exported_by             UUID NOT NULL
                            REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
    exported_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    file_name               TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    row_count               INTEGER NOT NULL CHECK (row_count >= 0),
    file_hash               TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX rbin_staging_exports_batch_idx
    ON public.rbin_staging_exports (batch_id, exported_at DESC);

CREATE INDEX rbin_staging_exports_actor_idx
    ON public.rbin_staging_exports (exported_by, exported_at DESC);

COMMIT;