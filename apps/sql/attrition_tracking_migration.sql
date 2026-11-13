BEGIN;

CREATE TABLE public.attrition_tracking_runs (
    run_id                    UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    reporting_month           DATE NOT NULL CHECK (EXTRACT(DAY FROM reporting_month) = 1),
    previous_import_id        BIGINT REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    previous_batch_id         UUID REFERENCES public.rbin_staging_batches(batch_id) ON DELETE RESTRICT,
    current_import_id         BIGINT NOT NULL UNIQUE
                              REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    current_batch_id          UUID NOT NULL UNIQUE
                              REFERENCES public.rbin_staging_batches(batch_id) ON DELETE RESTRICT,
    status                    TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'superseded')),
    out_of_ps_count           INTEGER NOT NULL DEFAULT 0 CHECK (out_of_ps_count >= 0),
    within_ps_count           INTEGER NOT NULL DEFAULT 0 CHECK (within_ps_count >= 0),
    pending_range_count       INTEGER NOT NULL DEFAULT 0 CHECK (pending_range_count >= 0),
    departure_candidate_count INTEGER NOT NULL DEFAULT 0 CHECK (departure_candidate_count >= 0),
    created_by_account_id     UUID NOT NULL
                              REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    superseded_at             TIMESTAMPTZ,

    CHECK ((previous_import_id IS NULL) = (previous_batch_id IS NULL)),
    CHECK ((status = 'active') = (superseded_at IS NULL)),
    CHECK (superseded_at IS NULL OR superseded_at >= created_at)
);

CREATE UNIQUE INDEX attrition_tracking_runs_active_month_idx
    ON public.attrition_tracking_runs (reporting_month)
    WHERE status = 'active';

CREATE INDEX attrition_tracking_runs_month_idx
    ON public.attrition_tracking_runs (reporting_month DESC, created_at DESC);

CREATE TABLE public.employee_attrition_events (
    event_id                   UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    run_id                     UUID NOT NULL
                               REFERENCES public.attrition_tracking_runs(run_id) ON DELETE RESTRICT,
    pers_no                    BIGINT NOT NULL CHECK (pers_no > 0),
    event_month                DATE NOT NULL CHECK (EXTRACT(DAY FROM event_month) = 1),
    event_type                 TEXT NOT NULL
                               CHECK (event_type IN ('transfer', 'resignation', 'retirement')),
    transfer_type              TEXT
                               CHECK (transfer_type IS NULL OR transfer_type IN (
                                   'out_of_ps_within_rbin', 'within_ps', 'out_of_ps_out_of_rbin'
                               )),
    within_ps_type             TEXT
                               CHECK (within_ps_type IS NULL OR within_ps_type IN (
                                   'plant_to_plant', 'plant_to_corp', 'corp_to_corp',
                                   'corp_to_plant', 'unclassified'
                               )),
    counts_as_ps_attrition     BOOLEAN NOT NULL,
    classification_status      TEXT NOT NULL
                               CHECK (classification_status IN ('confirmed', 'pending_range', 'conflict')),
    source                     TEXT NOT NULL CHECK (source IN ('rbin', 'ps_exit', 'manual')),
    old_organisational_area_pa TEXT,
    new_organisational_area_pa TEXT,
    old_organizational_unit    TEXT,
    new_organizational_unit    TEXT,
    old_range                  TEXT,
    new_range                  TEXT,
    old_range_type             TEXT CHECK (old_range_type IS NULL OR old_range_type IN ('plant', 'corporate')),
    new_range_type             TEXT CHECK (new_range_type IS NULL OR new_range_type IN ('plant', 'corporate')),
    previous_import_id         BIGINT REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    current_import_id          BIGINT NOT NULL
                               REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    notes                      TEXT CHECK (notes IS NULL OR CHAR_LENGTH(notes) <= 1000),
    is_reviewed                BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_account_id      UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    updated_by_account_id      UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    deleted_by_account_id      UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                 TIMESTAMPTZ,

    CHECK (
        (event_type = 'transfer' AND transfer_type IS NOT NULL)
        OR (event_type IN ('resignation', 'retirement') AND transfer_type IS NULL)
    ),
    CHECK ((transfer_type = 'within_ps') = (within_ps_type IS NOT NULL)),
    CHECK (
        (within_ps_type IS NOT DISTINCT FROM 'unclassified')
        = (classification_status = 'pending_range')
    ),
    CHECK (
        (transfer_type IS NOT DISTINCT FROM 'within_ps')
        = (counts_as_ps_attrition = FALSE)
    ),
    CHECK ((deleted_at IS NULL) = (deleted_by_account_id IS NULL)),
    CHECK (updated_at >= created_at),
    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

CREATE UNIQUE INDEX employee_attrition_events_active_employee_month_idx
    ON public.employee_attrition_events (pers_no, event_month)
    WHERE deleted_at IS NULL;

CREATE INDEX employee_attrition_events_timeline_idx
    ON public.employee_attrition_events (pers_no, event_month DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX employee_attrition_events_month_type_idx
    ON public.employee_attrition_events (event_month DESC, event_type, transfer_type)
    WHERE deleted_at IS NULL;

CREATE TABLE public.attrition_departure_candidates (
    candidate_id               UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    run_id                     UUID NOT NULL
                               REFERENCES public.attrition_tracking_runs(run_id) ON DELETE RESTRICT,
    pers_no                    BIGINT NOT NULL CHECK (pers_no > 0),
    detected_month             DATE NOT NULL CHECK (EXTRACT(DAY FROM detected_month) = 1),
    previous_organisational_area_pa TEXT,
    previous_organizational_unit    TEXT,
    previous_range             TEXT,
    previous_range_type        TEXT
                               CHECK (previous_range_type IS NULL OR previous_range_type IN ('plant', 'corporate')),
    previous_import_id         BIGINT NOT NULL
                               REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    current_import_id          BIGINT NOT NULL
                               REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    status                     TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'matched', 'dismissed', 'reappeared')),
    linked_event_id            UUID
                               REFERENCES public.employee_attrition_events(event_id) ON DELETE RESTRICT,
    resolution_note            TEXT CHECK (resolution_note IS NULL OR CHAR_LENGTH(resolution_note) <= 1000),
    created_by_account_id      UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    resolved_by_account_id     UUID REFERENCES public.auth_accounts(account_id) ON DELETE SET NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at                TIMESTAMPTZ,

    UNIQUE (pers_no, detected_month),
    CHECK ((status = 'pending') = (resolved_at IS NULL)),
    CHECK ((status = 'matched') = (linked_event_id IS NOT NULL)),
    CHECK (updated_at >= created_at),
    CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

CREATE INDEX attrition_departure_candidates_status_month_idx
    ON public.attrition_departure_candidates (status, detected_month DESC);

CREATE INDEX attrition_departure_candidates_employee_idx
    ON public.attrition_departure_candidates (pers_no, detected_month DESC);

COMMIT;