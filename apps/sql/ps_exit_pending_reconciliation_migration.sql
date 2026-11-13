BEGIN;

ALTER TABLE public.attrition_departure_candidates
    ALTER COLUMN run_id DROP NOT NULL,
    ALTER COLUMN previous_import_id DROP NOT NULL,
    ALTER COLUMN current_import_id DROP NOT NULL,
    ADD COLUMN source TEXT NOT NULL DEFAULT 'rbin'
        CHECK (source IN ('rbin', 'ps_exit')),
    ADD COLUMN ps_exit_import_id UUID
        REFERENCES public.ps_exit_imports(import_id) ON DELETE RESTRICT,
    ADD COLUMN exit_lwd DATE,
    ADD COLUMN exit_reason TEXT;

ALTER TABLE public.attrition_departure_candidates
    ADD CONSTRAINT attrition_departure_candidates_source_reference_check CHECK (
        (source = 'rbin'
            AND run_id IS NOT NULL
            AND previous_import_id IS NOT NULL
            AND current_import_id IS NOT NULL
            AND ps_exit_import_id IS NULL)
        OR (source = 'ps_exit'
            AND run_id IS NULL
            AND previous_import_id IS NULL
            AND current_import_id IS NULL
            AND ps_exit_import_id IS NOT NULL
            AND exit_lwd IS NOT NULL
            AND NULLIF(BTRIM(exit_reason), '') IS NOT NULL)
    );

CREATE INDEX attrition_departure_candidates_ps_exit_import_idx
    ON public.attrition_departure_candidates (ps_exit_import_id)
    WHERE ps_exit_import_id IS NOT NULL;

COMMIT;