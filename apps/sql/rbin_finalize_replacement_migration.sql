BEGIN;

ALTER TABLE public.rbin_namelist_history
    ADD COLUMN stored_row_data JSONB
    CHECK (stored_row_data IS NULL OR JSONB_TYPEOF(stored_row_data) = 'object');

INSERT INTO public.rbin_namelist_history (
    import_id, source_row_number, raw_source_data, stored_row_data, created_at
)
SELECT current_row.import_id, current_row.source_row_number,
       current_row.raw_source_data, TO_JSONB(current_row) - 'created_at',
       current_row.created_at
FROM public.rbin_namelist current_row
ON CONFLICT (import_id, source_row_number) DO UPDATE
SET stored_row_data = EXCLUDED.stored_row_data;

WITH latest_import AS (
    SELECT current_rows.import_id
    FROM public.rbin_namelist current_rows
    JOIN public.rbin_namelist_imports source_import
      ON source_import.id = current_rows.import_id
    GROUP BY current_rows.import_id, source_import.completed_at,
             source_import.created_at
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