CREATE TABLE public.employee_status (
    pers_no BIGINT PRIMARY KEY,

    status_type TEXT NOT NULL
        CHECK (
            status_type IN (
                'Maternity',
                'Sabbatical',
                'CRL',
                'Absconding'
            )
        ),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by TEXT NOT NULL
        CHECK (BTRIM(updated_by) <> '')
);

ALTER TABLE public.employee_status
    ADD COLUMN start_date DATE,
    ADD COLUMN end_date DATE,

    ADD CONSTRAINT employee_status_date_check
        CHECK (
            end_date IS NULL
            OR (
                start_date IS NOT NULL
                AND end_date >= start_date
            )
        );
