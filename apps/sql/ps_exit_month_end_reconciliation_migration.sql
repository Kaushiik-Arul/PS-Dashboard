BEGIN;

ALTER TABLE public.attrition_departure_candidates
    DROP CONSTRAINT IF EXISTS attrition_departure_candidates_pers_no_detected_month_key;

ALTER TABLE public.attrition_departure_candidates
    ADD CONSTRAINT attrition_departure_candidates_source_employee_month_key
        UNIQUE (source, pers_no, detected_month);

CREATE INDEX attrition_departure_candidates_pending_reconciliation_idx
    ON public.attrition_departure_candidates (pers_no, detected_month, source)
    WHERE status = 'pending';

ALTER TABLE public.ps_exit_imports
    ADD COLUMN reconciliation_month DATE;

UPDATE public.ps_exit_imports
SET reconciliation_month = retained_month
WHERE reconciliation_month IS NULL;

ALTER TABLE public.ps_exit_imports
    ALTER COLUMN reconciliation_month SET NOT NULL,
    ADD CONSTRAINT ps_exit_imports_reconciliation_month_first_day_check
        CHECK (EXTRACT(DAY FROM reconciliation_month) = 1);

COMMIT;