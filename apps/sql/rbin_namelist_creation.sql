BEGIN;

CREATE TABLE public.rbin_namelist_imports (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporting_month     DATE NOT NULL
                        CHECK (EXTRACT(DAY FROM reporting_month) = 1),
    uploaded_by         UUID NOT NULL
                        REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
    file_name           TEXT NOT NULL CHECK (NULLIF(BTRIM(file_name), '') IS NOT NULL),
    file_hash           TEXT NOT NULL CHECK (file_hash ~ '^[a-f0-9]{64}$'),
    total_rows          INTEGER CHECK (total_rows >= 0),
    ps_rows             INTEGER CHECK (ps_rows >= 0),
    excluded_rows       INTEGER CHECK (excluded_rows >= 0),
    valid_rows          INTEGER CHECK (valid_rows >= 0),
    invalid_rows        INTEGER CHECK (invalid_rows >= 0),
    status              TEXT NOT NULL DEFAULT 'processing'
                        CHECK (status IN ('processing', 'ready', 'failed', 'legacy')),
    failure_message     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMPTZ,

    CHECK (ps_rows IS NULL OR excluded_rows IS NULL OR ps_rows + excluded_rows = total_rows),
    CHECK (valid_rows IS NULL OR invalid_rows IS NULL OR valid_rows + invalid_rows = ps_rows),
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
    CHECK ((status = 'failed') = (failure_message IS NOT NULL)),
    CHECK (completed_at IS NULL OR completed_at >= created_at)
);

CREATE INDEX rbin_namelist_imports_owner_idx
    ON public.rbin_namelist_imports (uploaded_by, created_at DESC);

CREATE INDEX rbin_namelist_imports_status_idx
    ON public.rbin_namelist_imports (status, created_at DESC);

CREATE TABLE public.rbin_namelist (
    import_id               BIGINT NOT NULL
                            REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    source_row_number       INTEGER NOT NULL CHECK (source_row_number >= 2),
    raw_source_data         JSONB NOT NULL CHECK (JSONB_TYPEOF(raw_source_data) = 'object'),
    pers_no                 BIGINT,
    personnel_number        TEXT,
    joining_date            DATE,
    pa                      TEXT,
    personnel_area          TEXT,
    employee_group          TEXT,
    esgrp                   TEXT,
    employee_subgroup       TEXT,
    psubarea                TEXT,
    personnel_subarea       TEXT,
    lp                      TEXT,
    cost_center             TEXT,
    organizational_unit     TEXT,
    location                TEXT,
    organisational_area_pa  TEXT,
    gender_key              TEXT,
    global_id               BIGINT,
    ps_group                TEXT,
    birth_date              DATE,
    nt_id                   TEXT,
    designation_text        TEXT,
    other_designation       TEXT,
    entry_for_retirement    DATE,
    technical_entry_date    DATE,
    official_email          TEXT,
    direct_or_indirect      TEXT,
    hrbp_global_id          BIGINT,
    hrbp2_global_id         TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (import_id, source_row_number)
);

CREATE INDEX rbin_namelist_pers_no_idx
    ON public.rbin_namelist (pers_no)
    WHERE pers_no IS NOT NULL;

CREATE INDEX rbin_namelist_org_unit_idx
    ON public.rbin_namelist (LOWER(BTRIM(organizational_unit)))
    WHERE NULLIF(BTRIM(organizational_unit), '') IS NOT NULL;

CREATE TABLE public.rbin_namelist_history (
    import_id               BIGINT NOT NULL
                            REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    source_row_number       INTEGER NOT NULL CHECK (source_row_number >= 2),
    raw_source_data         JSONB NOT NULL CHECK (JSONB_TYPEOF(raw_source_data) = 'object'),
    stored_row_data         JSONB NOT NULL CHECK (JSONB_TYPEOF(stored_row_data) = 'object'),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (import_id, source_row_number)
);

CREATE INDEX rbin_namelist_history_import_idx
    ON public.rbin_namelist_history (import_id, source_row_number);

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

CREATE TABLE public.rbin_employee_column_exceptions (
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

CREATE INDEX rbin_employee_column_exceptions_pers_no_idx
    ON public.rbin_employee_column_exceptions (pers_no);

CREATE INDEX rbin_employee_column_exceptions_column_idx
    ON public.rbin_employee_column_exceptions (column_name, pers_no);

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
    range_source            TEXT NOT NULL CHECK (range_source IN ('mapping', 'exception', 'manual', 'missing')),
    function_source         TEXT NOT NULL CHECK (function_source IN ('mapping', 'exception', 'manual', 'missing')),
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
