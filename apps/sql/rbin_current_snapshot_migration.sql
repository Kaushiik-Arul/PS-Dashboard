BEGIN;

CREATE TABLE public.rbin_namelist_history (
    import_id               BIGINT NOT NULL
                            REFERENCES public.rbin_namelist_imports(id) ON DELETE RESTRICT,
    source_row_number       INTEGER NOT NULL CHECK (source_row_number >= 2),
    raw_source_data         JSONB NOT NULL CHECK (JSONB_TYPEOF(raw_source_data) = 'object'),
    stored_row_data         JSONB CHECK (stored_row_data IS NULL OR JSONB_TYPEOF(stored_row_data) = 'object'),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (import_id, source_row_number)
);

CREATE INDEX rbin_namelist_history_import_idx
    ON public.rbin_namelist_history (import_id, source_row_number);

INSERT INTO public.rbin_namelist_history (
    import_id, source_row_number, raw_source_data, stored_row_data, created_at
)
SELECT current_row.import_id, current_row.source_row_number, current_row.raw_source_data,
       TO_JSONB(current_row) - 'created_at', created_at
FROM public.rbin_namelist current_row;

WITH latest_import AS (
    SELECT current_rows.import_id
    FROM public.rbin_namelist current_rows
    JOIN public.rbin_namelist_imports source_import
      ON source_import.id = current_rows.import_id
    GROUP BY current_rows.import_id, source_import.reporting_month,
             source_import.completed_at, source_import.created_at
    ORDER BY source_import.completed_at DESC NULLS LAST,
             source_import.created_at DESC,
             current_rows.import_id DESC
    LIMIT 1
)
DELETE FROM public.rbin_namelist current_rows
WHERE NOT EXISTS (
    SELECT 1 FROM latest_import WHERE latest_import.import_id = current_rows.import_id
);

COMMIT;