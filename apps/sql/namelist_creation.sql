BEGIN;

CREATE TABLE employee_namelist (
    pers_no                 BIGINT  PRIMARY KEY,
    personnel_number        TEXT,
    employee_group          TEXT,
    lp                      TEXT,
    esgrp                   TEXT,
    employee_subgroup       TEXT,
    ps_group                TEXT,
    organizational_unit     TEXT,
    range                   TEXT,
    function                TEXT,
    organisational_area_pa  TEXT,
    gender_key              TEXT,
    location                TEXT,
    pa                      TEXT,
    personnel_area          TEXT,
    psubarea                TEXT,
    personnel_subarea       TEXT,
    nt_id                   TEXT,
    global_id               BIGINT,
    cost_center             TEXT,
    birth_date              DATE,
    joining_date            DATE,
    entry_for_retirement    DATE,
    designation_text        TEXT,
    hrbp_global_id          BIGINT,
    hrbp2_global_id         TEXT,
    official_email          TEXT,
    technical_entry_date    DATE,
    direct_or_indirect      TEXT
);

CREATE TABLE namelist_imports (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporting_month DATE NOT NULL
                    CHECK (EXTRACT(DAY FROM reporting_month) = 1),
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by     TEXT NOT NULL CHECK (BTRIM(imported_by) <> ''),
    file_name       TEXT NOT NULL CHECK (BTRIM(file_name) <> ''),
    total_rows      INTEGER CHECK (total_rows >= 0),
    status          TEXT NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing', 'completed', 'failed')),

    CHECK (status <> 'completed' OR total_rows IS NOT NULL)
);

COMMIT;

SELECT COUNT(*) FROM public.employee_namelist;

SELECT * from public.employee_namelist limit 10;

Select * from public.namelist_imports;