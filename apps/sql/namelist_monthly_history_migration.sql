BEGIN;

ALTER TABLE public.namelist_imports
    ADD COLUMN import_mode TEXT NOT NULL DEFAULT 'live'
    CHECK (import_mode IN ('live', 'historical'));

ALTER TABLE public.namelist_import_previews
    ADD COLUMN import_mode TEXT NOT NULL DEFAULT 'live'
    CHECK (import_mode IN ('live', 'historical'));

CREATE TABLE public.employee_namelist_monthly (
    reporting_month        DATE NOT NULL
                           CHECK (EXTRACT(DAY FROM reporting_month) = 1),
    source_import_id       BIGINT NOT NULL
                           REFERENCES public.namelist_imports(id),
    pers_no                BIGINT NOT NULL,
    personnel_number       TEXT,
    employee_group         TEXT,
    lp                     TEXT,
    esgrp                  TEXT,
    employee_subgroup      TEXT,
    ps_group               TEXT,
    organizational_unit    TEXT,
    range                  TEXT,
    function               TEXT,
    organisational_area_pa TEXT,
    gender_key             TEXT,
    location               TEXT,
    pa                     TEXT,
    personnel_area         TEXT,
    psubarea               TEXT,
    personnel_subarea      TEXT,
    nt_id                  TEXT,
    global_id              BIGINT,
    cost_center            TEXT,
    birth_date             DATE,
    joining_date           DATE,
    entry_for_retirement   DATE,
    designation_text       TEXT,
    hrbp_global_id         BIGINT,
    hrbp2_global_id        TEXT,
    official_email         TEXT,
    technical_entry_date   DATE,
    direct_or_indirect     TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (reporting_month, pers_no)
);

CREATE INDEX employee_namelist_monthly_function_idx
    ON public.employee_namelist_monthly (reporting_month, function);

CREATE INDEX employee_namelist_monthly_org_unit_idx
    ON public.employee_namelist_monthly (reporting_month, organizational_unit);

CREATE INDEX employee_namelist_monthly_range_idx
    ON public.employee_namelist_monthly (reporting_month, range);

CREATE INDEX employee_namelist_monthly_location_idx
    ON public.employee_namelist_monthly (reporting_month, location);

CREATE INDEX employee_namelist_monthly_gender_idx
    ON public.employee_namelist_monthly (reporting_month, gender_key);

CREATE INDEX employee_namelist_monthly_direct_indirect_idx
    ON public.employee_namelist_monthly (reporting_month, direct_or_indirect);

COMMIT;